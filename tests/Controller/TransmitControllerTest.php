<?php

namespace App\Tests\Controller;

use App\Controller\TransmitController;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransmitControllerTest extends TestCase
{
    private function controller(): TransmitController
    {
        // Redis is never actually contacted by the paths under test here:
        // subscribe() only opens a connection inside the StreamedResponse
        // callback (which runs on send(), not on controller invocation),
        // and every publish() case below is rejected by validation first.
        return new TransmitController('127.0.0.1', 6379);
    }

    public function testSubscribeRejectsMissingId(): void
    {
        $response = $this->controller()->subscribe(Request::create('/api/transmit'));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'missing id'], json_decode($response->getContent(), true));
    }

    public function testSubscribeRejectsEmptyId(): void
    {
        $response = $this->controller()->subscribe(Request::create('/api/transmit?id='));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'missing id'], json_decode($response->getContent(), true));
    }

    #[DataProvider('invalidIdProvider')]
    public function testSubscribeRejectsInvalidId(string $id): void
    {
        $response = $this->controller()->subscribe(Request::create('/api/transmit?id=' . urlencode($id)));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'invalid id'], json_decode($response->getContent(), true));
    }

    public function testSubscribeAcceptsValidIdAndSetsEventStreamHeaders(): void
    {
        $response = $this->controller()->subscribe(Request::create('/api/transmit?id=abc123'));

        $this->assertInstanceOf(StreamedResponse::class, $response);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('text/event-stream', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-cache', $response->headers->get('Cache-Control'));
        $this->assertSame('keep-alive', $response->headers->get('Connection'));
        $this->assertSame('no', $response->headers->get('X-Accel-Buffering'));
    }

    public function testSubscribeAcceptsIdAtMaxLength(): void
    {
        $id = str_repeat('a', 64);
        $response = $this->controller()->subscribe(Request::create('/api/transmit?id=' . $id));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testPublishRejectsMissingId(): void
    {
        $response = $this->controller()->publish(Request::create('/api/transmit', 'POST'));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'missing id'], json_decode($response->getContent(), true));
    }

    #[DataProvider('invalidIdProvider')]
    public function testPublishRejectsInvalidId(string $id): void
    {
        $response = $this->controller()->publish(Request::create('/api/transmit?id=' . urlencode($id), 'POST'));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'invalid id'], json_decode($response->getContent(), true));
    }

    public function testPublishRejectsMissingBody(): void
    {
        $response = $this->controller()->publish(Request::create('/api/transmit?id=abc123', 'POST'));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'invalid text'], json_decode($response->getContent(), true));
    }

    public function testPublishRejectsNonStringText(): void
    {
        $request = Request::create('/api/transmit?id=abc123', 'POST', [], [], [], [], json_encode(['text' => 42]));

        $response = $this->controller()->publish($request);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'invalid text'], json_decode($response->getContent(), true));
    }

    public function testPublishRejectsEmptyText(): void
    {
        $request = Request::create('/api/transmit?id=abc123', 'POST', [], [], [], [], json_encode(['text' => '']));

        $response = $this->controller()->publish($request);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'invalid text'], json_decode($response->getContent(), true));
    }

    public function testPublishRejectsInvalidJsonBody(): void
    {
        $request = Request::create('/api/transmit?id=abc123', 'POST', [], [], [], [], 'not json');

        $response = $this->controller()->publish($request);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['error' => 'invalid text'], json_decode($response->getContent(), true));
    }

    public static function invalidIdProvider(): array
    {
        return [
            'contains punctuation' => ['abc!'],
            'contains slash' => ['abc/def'],
            'contains space' => ['abc def'],
            'too long' => [str_repeat('a', 65)],
        ];
    }
}
