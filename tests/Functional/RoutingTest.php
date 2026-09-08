<?php

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class RoutingTest extends WebTestCase
{
    public function testHomePageRenders(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        $this->assertResponseIsSuccessful();
        $this->assertStringContainsString('<title>lux-tx</title>', $client->getResponse()->getContent());
    }

    public function testSubscribeWithoutIdReturns400(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/transmit');

        $this->assertResponseStatusCodeSame(400);
        $this->assertSame(['error' => 'missing id'], json_decode($client->getResponse()->getContent(), true));
    }

    // The valid-id subscribe path is intentionally not exercised through the
    // HTTP test client: KernelBrowser's filterResponse() calls
    // StreamedResponse::sendContent() to capture the body, which here would
    // run the SSE loop's blocking Redis SUBSCRIBE for real. That headers/
    // validation behavior is covered directly on the controller instead, see
    // TransmitControllerTest::testSubscribeAcceptsValidIdAndSetsEventStreamHeaders.

    public function testPublishWithoutIdReturns400(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/transmit');

        $this->assertResponseStatusCodeSame(400);
        $this->assertSame(['error' => 'missing id'], json_decode($client->getResponse()->getContent(), true));
    }

    public function testPublishWithMissingTextReturns400(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/transmit?id=abc123');

        $this->assertResponseStatusCodeSame(400);
        $this->assertSame(['error' => 'invalid text'], json_decode($client->getResponse()->getContent(), true));
    }

    public function testTransmitRouteRejectsUnsupportedMethod(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/transmit?id=abc123');

        $this->assertResponseStatusCodeSame(405);
    }
}
