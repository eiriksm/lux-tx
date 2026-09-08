<?php

namespace App\Tests\Browser;

use Playwright\Symfony\Test\PlaywrightTestCase;

/**
 * Real-browser coverage for the composer page's JS: channel-id handling, the
 * Listen button's error path, and the send/timestamp actions going through
 * the real kernel (and, for publish, real Redis).
 *
 * The page's own EventSource is stubbed via addInitScript() before every
 * navigation: playwright-symfony bridges browser requests to the kernel by
 * buffering the full response body (see ResponseConverter::prepareFulfillOptions()),
 * which for the SSE subscribe endpoint means driving TransmitController's
 * `while (!connection_aborted())` loop to completion — connection_aborted()
 * never becomes true here, so the real endpoint would hang the test forever.
 * Stubbing EventSource avoids that request entirely, and still lets tests
 * drive the real decode/flash pipeline by firing a synthetic onmessage.
 */
class TransmitFlowTest extends PlaywrightTestCase
{
    private const STUB_EVENT_SOURCE = <<<'JS'
        window.__esInstances = [];
        window.EventSource = class {
            constructor(url) {
                this.url = url;
                this.onmessage = null;
                window.__esInstances.push(this);
            }
            addEventListener() {}
            close() {}
        };
        JS;

    public function testSendingMessagePublishesThroughTheRealBackend(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/?id=e2esend');

        $this->fill('#input', 'hello world');
        $this->click('#sendBtn');

        $this->getPage()->waitForFunction(
            "() => document.getElementById('input').value === ''",
        );

        $response = $this->getLastResponse();
        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertSame(['ok' => true, 'id' => 'e2esend', 'text' => 'hello world'], $body);
    }

    public function testTimestampButtonPublishesANearCurrentUnixTime(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/?id=e2ets01');

        $before = time();
        $this->click('#timestampBtn');

        $response = $this->getLastResponse();
        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);

        $this->assertIsArray($body);
        $this->assertTrue(ctype_digit((string) ($body['text'] ?? '')), 'Timestamp text should be a plain integer string.');
        // The button adds a small fixed offset (roughly one protocol symbol's
        // worth of ticks) on top of "now", so allow a few seconds of slack.
        $this->assertGreaterThanOrEqual($before, (int) $body['text']);
        $this->assertLessThan($before + 5, (int) $body['text']);
    }

    public function testChannelIdIsGeneratedAndPersistedInUrl(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/');

        $this->getPage()->waitForFunction(
            "() => new URLSearchParams(window.location.search).get('id') !== null",
        );

        $id = $this->getPage()->evaluate("() => new URLSearchParams(window.location.search).get('id')");

        $this->assertIsString($id);
        $this->assertMatchesRegularExpression('/^[a-z0-9]{4}$/', $id);
        $this->assertSame($id, $this->getPage()->locator('#channelId')->textContent());
    }

    public function testExplicitChannelIdInUrlIsKept(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/?id=fixedid');

        $this->assertPageContains('fixedid');
        $this->assertSame('fixedid', $this->getPage()->locator('#channelId')->textContent());
    }

    public function testListenButtonFallsBackToErrorWithoutMicrophoneAccess(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/?id=fixedid');

        $this->click('#listenBtn');

        $this->getPage()->waitForFunction(
            "() => document.getElementById('listenLabel').textContent === 'Retry'",
            null,
            ['timeout' => 5000],
        );
        $this->assertStringContainsString('bg-red-500', (string) $this->getPage()->locator('#listenDot')->getAttribute('class'));
    }

    public function testReceivingAMessageFlashesAndRestoresTheOverlay(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/?id=fixedid');

        $this->getPage()->evaluate(<<<'JS'
            () => {
                const es = window.__esInstances[window.__esInstances.length - 1];
                es.onmessage({ data: JSON.stringify({ text: 'hi' }) });
            }
            JS);

        $this->getPage()->waitForFunction(
            "() => !document.getElementById('flash').classList.contains('hidden')",
            null,
            ['timeout' => 2000],
        );
        $this->assertFalse($this->getPage()->locator('#flash')->evaluate("el => el.classList.contains('hidden')"));

        $this->getPage()->waitForFunction(
            "() => document.getElementById('flash').classList.contains('hidden')",
            null,
            ['timeout' => 5000],
        );
        $this->assertTrue($this->getPage()->locator('#flash')->evaluate("el => el.classList.contains('hidden')"));
    }
}
