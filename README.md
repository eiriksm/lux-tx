# lux-tx
Trasmitter for the LUX light sensing protocol for second movement

A single Symfony app: it serves the page (flashing-screen transmitter UI) and the
`/api/transmit` SSE endpoint. State for the SSE fan-out lives in Redis pub/sub, so
it works across multiple PHP workers/processes.

The frontend (`public/assets/app.js` + `app.css`) is plain JS/CSS, no build step.
The FESK decoder (`public/assets/vendor/fesk-rt/`) is vendored from the
[fesk-rt](https://github.com/eiriksm/fesk-rt) npm package as a self-contained ES
module — see `LICENSE` alongside it.

## Running locally

```
redis-server --daemonize yes
composer install
PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8000 -t public
```

Then open http://127.0.0.1:8000/.
