import { connect } from "nats";
import { loadConfig } from "./config.js";
import { BeeGateTestServer } from "./fake-agent.js";

async function main(): Promise<void> {
	const config = loadConfig();
	const connection = await connect({
		servers: config.nats.servers,
		name: config.nats.name,
	});
	const server = new BeeGateTestServer(connection, config);
	const stop = await server.start();

	process.on("SIGINT", async () => {
		await stop();
		await connection.drain();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		await stop();
		await connection.drain();
		process.exit(0);
	});
}

void main();
