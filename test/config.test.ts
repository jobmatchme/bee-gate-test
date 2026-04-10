import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("bee-gate-test config", () => {
	it("provides stable defaults", () => {
		const config = loadConfig();
		expect(config.worker.subject).toBeTruthy();
		expect(config.nats.servers).toBeTruthy();
	});
});
