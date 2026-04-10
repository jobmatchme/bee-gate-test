import type { BeeGateTestConfig } from "./types.js";

export function loadConfig(): BeeGateTestConfig {
	return {
		nats: {
			servers: process.env.BEE_GATE_TEST_NATS_SERVERS || "nats://127.0.0.1:4222",
			name: process.env.BEE_GATE_TEST_NATS_NAME || "bee-gate-test",
		},
		worker: {
			subject: process.env.BEE_GATE_TEST_SUBJECT || "bee.agent.test",
			agentId: process.env.BEE_GATE_TEST_AGENT_ID || "agent:bee:test",
			responseDelayMs: parseInt(process.env.BEE_GATE_TEST_RESPONSE_DELAY_MS || "150", 10),
		},
	};
}
