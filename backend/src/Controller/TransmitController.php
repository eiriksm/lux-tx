<?php

namespace App\Controller;

use Redis;
use RedisException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class TransmitController
{
    private const HEARTBEAT_INTERVAL_SECONDS = 20;

    public function __construct(
        private readonly string $redisHost,
        private readonly int $redisPort,
    ) {
    }

    #[Route('/api/transmit', name: 'transmit_subscribe', methods: ['GET'])]
    public function subscribe(Request $request): Response
    {
        $id = $request->query->get('id');
        if (!$id) {
            return new JsonResponse(['error' => 'missing id'], 400);
        }

        $response = new StreamedResponse(function () use ($id) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }

            $channel = "transmit:$id";

            // Redis SUBSCRIBE blocks until a message arrives; OPT_READ_TIMEOUT bounds that
            // wait so we can send a keepalive and notice a closed connection periodically.
            while (!connection_aborted()) {
                $redis = new Redis();
                $redis->connect($this->redisHost, $this->redisPort);
                $redis->setOption(Redis::OPT_READ_TIMEOUT, self::HEARTBEAT_INTERVAL_SECONDS);

                try {
                    $redis->subscribe([$channel], function (Redis $redis, string $chan, string $message) {
                        echo "data: {$message}\n\n";
                        flush();
                        if (connection_aborted()) {
                            $redis->unsubscribe([$chan]);
                        }
                    });
                } catch (RedisException) {
                    echo ": ping\n\n";
                    flush();
                }
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no');

        return $response;
    }

    #[Route('/api/transmit', name: 'transmit_publish', methods: ['POST'])]
    public function publish(Request $request): JsonResponse
    {
        $id = $request->query->get('id');
        if (!$id) {
            return new JsonResponse(['error' => 'missing id'], 400);
        }

        $body = json_decode($request->getContent(), true) ?? [];
        $text = $body['text'] ?? null;
        if (!is_string($text) || $text === '') {
            return new JsonResponse(['error' => 'invalid text'], 400);
        }

        $callbackUrl = $body['callbackUrl'] ?? null;
        $callbackUrl = is_string($callbackUrl) ? $callbackUrl : null;

        $redis = new Redis();
        $redis->connect($this->redisHost, $this->redisPort);
        $payload = json_encode(array_filter([
            'text' => $text,
            'callbackUrl' => $callbackUrl,
        ], static fn ($v) => $v !== null));
        $redis->publish("transmit:$id", $payload);

        return new JsonResponse(['ok' => true, 'id' => $id, 'text' => $text]);
    }
}
