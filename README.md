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

## Publishing

The package is intended for public npm publication from GitHub Actions using npm
Trusted Publishing via GitHub OIDC.

## License

MIT
