import { assertValidEnvelope, type Envelope, type ProtocolCapabilities } from "@jobmatchme/bee-dance-core";
import { BEE_PROTOCOL_VERSION_MANIFEST } from "@jobmatchme/bee-dance-schema";
import { JSONCodec, type NatsConnection, type Subscription } from "nats";
import type { BeeGateTestConfig } from "./types.js";

const codec = JSONCodec<Envelope>();

interface PendingTurn {
	sessionId: string;
	threadId?: string;
	turnId: string;
	timeoutIds: ReturnType<typeof setTimeout>[];
}

const SERVER_CAPABILITIES: ProtocolCapabilities = {
	coreVersions: [BEE_PROTOCOL_VERSION_MANIFEST.protocolVersion],
	interactionProfiles: ["profile.chat.slack"],
	inputParts: ["text"],
	outputParts: ["text", "status", "approval"],
	events: [
		"run.started",
		"run.completed",
		"run.failed",
		"item.appended",
		"item.updated",
		"item.completed",
		"approval.requested",
	],
	actions: [],
	extensions: {},
	streaming: true,
};

export class BeeGateTestServer {
	private pendingTurns = new Map<string, PendingTurn>();

	constructor(
		private connection: NatsConnection,
		private config: BeeGateTestConfig,
	) {}

	async start(): Promise<() => Promise<void>> {
		const protocolSub = this.connection.subscribe(this.protocolSubject);
		const commandSub = this.connection.subscribe(this.commandSubject);

		const protocolTask = this.handleProtocol(protocolSub);
		const commandTask = this.handleCommands(commandSub);

		return async () => {
			protocolSub.unsubscribe();
			commandSub.unsubscribe();
			for (const pending of this.pendingTurns.values()) {
				for (const timeoutId of pending.timeoutIds) {
					clearTimeout(timeoutId);
				}
			}
			this.pendingTurns.clear();
			await Promise.allSettled([protocolTask, commandTask]);
		};
	}

	private get protocolSubject(): string {
		return `${this.config.worker.subject}.protocol`;
	}

	private get commandSubject(): string {
		return `${this.config.worker.subject}.command`;
	}

	private sessionEventsSubject(sessionId: string): string {
		return `${this.config.worker.subject}.session.${sessionId.replace(/[^a-zA-Z0-9_-]/g, "_")}.event`;
	}

	private async handleProtocol(subscription: Subscription): Promise<void> {
		for await (const message of subscription) {
			try {
				if (!message.reply) continue;
				const envelope = codec.decode(message.data);
				assertValidEnvelope(envelope);
				if (envelope.name !== "protocol.hello") continue;

				const welcome: Envelope<{
					protocolVersion: string;
					selectedCoreVersion: string;
					capabilities: ProtocolCapabilities;
				}> = {
					id: `msg_${crypto.randomUUID()}`,
					type: "response",
					name: "protocol.welcome",
					time: new Date().toISOString(),
					sessionId: envelope.sessionId,
					threadId: envelope.threadId,
					turnId: envelope.turnId,
					from: {
						kind: "agent",
						id: this.config.worker.agentId || "agent:bee:test",
					},
					to: envelope.from,
					replyTo: envelope.id,
					payload: {
						protocolVersion: BEE_PROTOCOL_VERSION_MANIFEST.protocolVersion,
						selectedCoreVersion: BEE_PROTOCOL_VERSION_MANIFEST.protocolVersion,
						capabilities: SERVER_CAPABILITIES,
					},
				};
				this.publishEnvelope(message.reply, welcome, "protocol.welcome");
			} catch (error) {
				this.logError("Failed to handle bee protocol message", error, message.data);
			}
		}
	}

	private async handleCommands(subscription: Subscription): Promise<void> {
		for await (const message of subscription) {
			try {
				const envelope = codec.decode(message.data);
				assertValidEnvelope(envelope);
				if (envelope.name === "turn.start") {
					this.scheduleTurn(envelope);
					continue;
				}
				if (envelope.name === "turn.cancel") {
					this.cancelTurn(envelope);
				}
			} catch (error) {
				this.logError("Failed to handle bee command message", error, message.data);
			}
		}
	}

	private scheduleTurn(envelope: Envelope): void {
		const itemId = `item_${crypto.randomUUID()}`;
		const pending: PendingTurn = {
			sessionId: envelope.sessionId,
			threadId: envelope.threadId,
			turnId: envelope.turnId || `turn_${crypto.randomUUID()}`,
			timeoutIds: [],
		};
		this.pendingTurns.set(pending.turnId, pending);

		const publish = (delayMs: number, event: Envelope) => {
			const timeoutId = setTimeout(() => {
				this.publishEnvelope(this.sessionEventsSubject(pending.sessionId), event, event.name);
			}, delayMs);
			pending.timeoutIds.push(timeoutId);
		};

		const baseEvent = {
			sessionId: pending.sessionId,
			threadId: pending.threadId,
			turnId: pending.turnId,
			from: {
				kind: "agent" as const,
				id: this.config.worker.agentId || "agent:bee:test",
			},
			to: envelope.from,
			replyTo: envelope.id,
		};

		publish(this.config.worker.responseDelayMs || 150, {
			id: `msg_${crypto.randomUUID()}`,
			type: "event",
			name: "run.started",
			time: new Date().toISOString(),
			...baseEvent,
			payload: {
				eventType: "run.started",
			},
		});

		publish((this.config.worker.responseDelayMs || 150) * 2, {
			id: `msg_${crypto.randomUUID()}`,
			type: "event",
			name: "item.appended",
			time: new Date().toISOString(),
			...baseEvent,
			payload: {
				eventType: "item.appended",
				item: {
					id: itemId,
					kind: "message",
					role: "assistant",
					parts: [{ kind: "text", text: "bee-gate-test received your turn and is simulating a response." }],
				},
			},
		});

		publish((this.config.worker.responseDelayMs || 150) * 3, {
			id: `msg_${crypto.randomUUID()}`,
			type: "event",
			name: "item.updated",
			time: new Date().toISOString(),
			...baseEvent,
			payload: {
				eventType: "item.updated",
				itemId,
				appendParts: [{ kind: "text", text: "\nNo real agent is running behind this test harness." }],
			},
		});

		publish((this.config.worker.responseDelayMs || 150) * 4, {
			id: `msg_${crypto.randomUUID()}`,
			type: "event",
			name: "run.completed",
			time: new Date().toISOString(),
			...baseEvent,
			payload: {
				eventType: "run.completed",
				stopReason: "completed",
			},
		});

		const cleanupTimeout = setTimeout(
			() => {
				this.pendingTurns.delete(pending.turnId);
			},
			(this.config.worker.responseDelayMs || 150) * 5,
		);
		pending.timeoutIds.push(cleanupTimeout);
	}

	private cancelTurn(envelope: Envelope): void {
		const turnId = envelope.turnId;
		if (!turnId) return;
		const pending = this.pendingTurns.get(turnId);
		if (!pending) return;
		for (const timeoutId of pending.timeoutIds) {
			clearTimeout(timeoutId);
		}
		this.pendingTurns.delete(turnId);

		const failed: Envelope<{ eventType: "run.failed"; error: string }> = {
			id: `msg_${crypto.randomUUID()}`,
			type: "event",
			name: "run.failed",
			time: new Date().toISOString(),
			sessionId: pending.sessionId,
			threadId: pending.threadId,
			turnId: pending.turnId,
			from: {
				kind: "agent",
				id: this.config.worker.agentId || "agent:bee:test",
			},
			to: envelope.from,
			replyTo: envelope.id,
			payload: {
				eventType: "run.failed",
				error: "Turn cancelled by client",
			},
		};
		this.publishEnvelope(this.sessionEventsSubject(pending.sessionId), failed, "run.failed");
	}

	private publishEnvelope(subject: string, envelope: Envelope, label: string): void {
		try {
			assertValidEnvelope(envelope);
			this.connection.publish(subject, codec.encode(envelope));
		} catch (error) {
			this.logError(`Failed to publish ${label}`, error, envelope);
		}
	}

	private logError(message: string, error: unknown, details?: unknown): void {
		const suffix = error instanceof Error ? error.message : String(error);
		if (details === undefined) {
			console.error(`[bee-gate-test] ${message}: ${suffix}`);
			return;
		}
		console.error(`[bee-gate-test] ${message}: ${suffix}`, details);
	}
}
