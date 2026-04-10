# syntax=docker/dockerfile:1.6
FROM node:20-alpine

LABEL org.opencontainers.image.source="https://github.com/jobmatchme/bee-gate-test"

ARG BEE_GATE_TEST_PACKAGE=@jobmatchme/bee-gate-test

RUN apk add --no-cache \
    ca-certificates \
    tini

RUN addgroup -g 10001 -S app && adduser -S -D -H -u 10001 -G app -h /workspace app

RUN npm install -g --ignore-scripts "${BEE_GATE_TEST_PACKAGE}"

WORKDIR /workspace
RUN mkdir -p /workspace && chown -R 10001:10001 /workspace

USER 10001:10001

ENV HOME=/workspace
ENV NODE_ENV=production
ENV BEE_GATE_TEST_NATS_SERVERS=nats://nats.nats.svc.cluster.local:4222
ENV BEE_GATE_TEST_NATS_NAME=bee-gate-test
ENV BEE_GATE_TEST_SUBJECT=bee.agent.test

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/usr/local/lib/node_modules/@jobmatchme/bee-gate-test/dist/main.js"]
