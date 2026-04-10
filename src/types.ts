export interface BeeGateTestConfig {
	nats: {
		servers: string | string[];
		name?: string;
	};
	worker: {
		subject: string;
		agentId?: string;
		responseDelayMs?: number;
	};
}
