# Calora FatSecret Gateway

Small server-to-server gateway intended for Railway deployment with a static
outbound IP. It is not a public mobile API: only the existing Calora backend
may call it using `CALORA_GATEWAY_SECRET`.

## Railway static-egress setup

This service only resolves the allowlist problem when Railway provides a static
outbound egress IP. Before enabling it in Calora:

1. Create a Railway service from this directory and enable Railway's static
   outbound egress feature for that service/region.
2. Record the assigned outbound IP address from Railway.
3. Give that exact IP to FatSecret for allowlisting against Calora's approved
   Premier account. Do not use a temporary Replit egress address.
4. Deploy the gateway, then call its `/health` endpoint and use a server-side
   authenticated operation call to verify a known recipe and known branded
   restaurant item succeed through that assigned IP.
5. Only after that verification, set the Calora backend migration variables
   below and repeat the real QA-account search, detail, review, and diary-log
   flow in the launch market.

Do not enable `FATSECRET_GATEWAY_URL` until the assigned static egress IP is
allowlisted. A normal Railway deployment without static egress can reproduce
FatSecret error 21.

## Railway configuration

Set these Railway service variables:

- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `CALORA_GATEWAY_SECRET` — a strong, independent shared secret
- `PORT` — supplied automatically by Railway
- `FATSECRET_PROVIDER_TIMEOUT_MS` — optional; defaults to `8000`

Railway build command: `pnpm --filter @workspace/fatsecret-gateway run build`

Railway start command: `pnpm --filter @workspace/fatsecret-gateway run start`

Health check path: `/health`

## Production build behavior

The gateway bundles only its local TypeScript source into `dist/index.mjs`.
Node runtime packages, including Express and Pino, remain external and load
from the deployment's installed `node_modules`. This is intentional: Express
uses CommonJS dependencies such as `debug` and `body-parser`, whose runtime
`require()` calls must execute in Node's CommonJS loader rather than inside an
ESM bundle wrapper.

No Railway command change is needed:

- Build: `pnpm --filter @workspace/fatsecret-gateway run build`
- Start: `pnpm --filter @workspace/fatsecret-gateway run start`

## Internal API contract

All operation endpoints require `x-calora-gateway-secret` and JSON bodies:

| Endpoint | Body |
| --- | --- |
| `POST /fatsecret/recipes/search` | `{ query?, category?, limit, offset }` |
| `POST /fatsecret/recipes/detail` | `{ sourceId }` |
| `POST /fatsecret/foods/search` | `{ query, limit, offset }` |
| `POST /fatsecret/foods/detail` | `{ sourceId }` |

Successful responses preserve the raw FatSecret payload envelope. FatSecret
error envelopes are forwarded unchanged so the Calora backend retains its
existing provider error mapping and user-safe responses. Gateway-originated
errors use `{ error: { code, message } }` and never contain credentials or
access tokens.

## Calora backend migration

After Railway is deployed and reachable, set only these server-side variables
on the existing Calora backend:

- `FATSECRET_GATEWAY_URL=https://<railway-service-domain>` — HTTPS is required in production
- `FATSECRET_GATEWAY_SECRET=<the same shared secret>`

Keep the mobile app unchanged. To roll back, remove `FATSECRET_GATEWAY_URL`;
the backend falls back to its current direct FatSecret transport.