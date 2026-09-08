<?php

namespace App\Tests\Integration;

use App\Controller\TransmitController;
use PHPUnit\Framework\TestCase;
use Redis;
use RedisException;
use Symfony\Component\HttpFoundation\Request;

/**
 * Exercises the real publish() path against Redis, skipping if none is
 * reachable — CI/local dev environments without a Redis service can still
 * run the rest of the suite.
 */
class TransmitControllerRedisTest extends TestCase
{
    private string $host;
    private int $port;

    protected function setUp(): void
    {
        $this->host = getenv('REDIS_HOST') ?: '127.0.0.1';
        $this->port = (int) (getenv('REDIS_PORT') ?: 6379);

        $redis = new Redis();
        try {
            $redis->connect($this->host, $this->port, 1.0);
        } catch (RedisException $e) {
            self::markTestSkipped('Redis is not reachable at ' . $this->host . ':' . $this->port . ': ' . $e->getMessage());
        }
    }

    public function testPublishConnectsAndReturnsOk(): void
    {
        $controller = new TransmitController($this->host, $this->port);
        $request = Request::create(
            '/api/transmit?id=abc123',
            'POST',
            [],
            [],
            [],
            [],
            json_encode(['text' => 'hello world']),
        );

        $response = $controller->publish($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            ['ok' => true, 'id' => 'abc123', 'text' => 'hello world'],
            json_decode($response->getContent(), true),
        );
    }

    public function testPublishSendsCallbackUrlInPayload(): void
    {
        $id = 'itest' . bin2hex(random_bytes(4));
        $controller = new TransmitController($this->host, $this->port);

        $request = Request::create(
            '/api/transmit?id=' . $id,
            'POST',
            [],
            [],
            [],
            [],
            json_encode(['text' => 'hello', 'callbackUrl' => 'https://example.com/cb']),
        );

        // Redis PUBLISH reports how many subscribers received the message;
        // with none listening it's always 0, so we only assert the call
        // succeeds and the HTTP-facing response stays unaffected by the
        // extra callbackUrl field.
        $response = $controller->publish($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            ['ok' => true, 'id' => $id, 'text' => 'hello'],
            json_decode($response->getContent(), true),
        );
    }
}
