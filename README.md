# `@jobmatchme/bee-gate-test`

`bee-gate-test` is a lightweight fake backend for local and automated testing of
Bee Gate based integrations.

It is not a production agent runtime. Instead, it behaves like a predictable
Bee Dance peer that can answer the protocol handshake, accept turns, emit a
small stream of events, and react to cancellation. That makes it useful when
you want to exercise adapters, gateways, and protocol plumbing without bringing
up a real agent implementation.

## What this package does

- listens on NATS subjects used by Bee Gate
- answers the Bee Dance protocol handshake
- emits deterministic `run.*` and `item.*` events
- supports test cancellation paths
- logs invalid protocol messages instead of silently swallowing them

## Typical usage

This package is mainly intended for:

- local end-to-end testing of chat adapters and gateways
- contract testing of Bee Dance event handling
- development environments where a real agent backend is not available yet

## Docker

A container image can run the fake agent directly and only needs the same
environment variables as the Node.js process:

- `BEE_GATE_TEST_SUBJECT` to choose the base NATS subject
- `BEE_GATE_TEST_NATS_SERVERS` to override the NATS server list when needed

The bundled `Dockerfile` installs the published npm package and starts the test
agent with the defaults that fit the in-cluster `nats` service.

## Helm

A minimal Helm chart is provided in `charts/bee-gate-test`.

The chart intentionally does not create or require a Secret. Its only
application-level setting is `subject`, which is mapped to
`BEE_GATE_TEST_SUBJECT`. The NATS server target stays fixed to the cluster
default used by the container image.

## Publishing

The package is intended for public npm publication from GitHub Actions using npm
Trusted Publishing via GitHub OIDC.

## License

MIT
