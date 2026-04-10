import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("bee-gate-test config", () => {
	it("provides stable defaults", () => {
		const config = loadConfig();
		expect(config.worker.subject).toBe("bee.agent.test");
		expect(config.nats.servers).toBe("nats://nats.nats.svc.cluster.local:4222");
		expect(config.nats.name).toBe("bee-gate-test");
	});
});
