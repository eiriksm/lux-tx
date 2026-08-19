# lux-tx
Trasmitter for the LUX light sensing protocol for second movement

## Backend

The `/api/transmit` SSE endpoint is served by a Symfony app in `backend/`, using
Redis pub/sub to fan messages out to subscribers (instead of an in-process `Map`),
so it works across multiple PHP workers/processes.

To run locally:

```
redis-server --daemonize yes
cd backend && composer install
PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8000 -t public
```

Then, in the repo root, `npm run dev` — `next.config.ts` rewrites `/api/transmit`
to `BACKEND_URL` (default `http://127.0.0.1:8000`).
