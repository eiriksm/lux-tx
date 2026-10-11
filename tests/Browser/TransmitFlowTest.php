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

    /** Mirror of SYMBOLS in public/assets/app.js, indexed by symbol value. */
    private const SYMBOLS = [
        '',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        ' ',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        '.', ',', '!', '?', "'", '-', ':', ';', '(', ')', '/',
        '@', '#', '&', '+', '=', '_', '~', '*', '"', '%', "\n",
        'A', 'B',
        '>',
    ];

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

    public function testTorchModeFallsBackToScreenWithoutCameraAccess(): void
    {
        $this->getPage()->addInitScript(self::STUB_EVENT_SOURCE);
        $this->visit('/?id=fixedid');

        $this->assertSame('Screen', $this->getPage()->locator('#modeLabel')->textContent());
        $this->click('#modeBtn');

        $this->getPage()->waitForFunction(
            "() => document.getElementById('modeLabel').textContent === 'No torch'",
            null,
            ['timeout' => 5000],
        );
        $this->assertStringContainsString('bg-red-500', (string) $this->getPage()->locator('#modeDot')->getAttribute('class'));
        $this->assertSame('false', $this->getPage()->locator('#modeBtn')->getAttribute('aria-pressed'));
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

    /**
     * @return iterable<string, array{string}>
     */
    public static function symbolSetMessages(): iterable
    {
        yield 'lowercase and digits' => ['hi there 42'];
        yield 'punctuation' => ['ok? yes! (a/b) #1 50%'];
        // C-Z fold onto their lowercase symbols, A/B have their own.
        yield 'uppercase' => ['ABC Hello'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('symbolSetMessages')]
    public function testMessagesInsideTheSymbolSetAreSentAsIs(string $text): void
    {
        [$header, $frameBits] = $this->transmitAndCaptureLog($text);

        $this->assertSame(\sprintf('transmit "%s"', $text), $this->logSubject($header));
        $this->assertSame($this->foldCase($text), $this->decodeFrame($frameBits));
    }

    /**
     * Expected wire text comes from Python's base64.b32encode (lowercased,
     * padding stripped), covering every tail length: 0, 1, 3 and 4 bits.
     *
     * @return iterable<string, array{string, string}>
     */
    public static function nonSymbolSetMessages(): iterable
    {
        yield 'single accented char' => ['é', 'youq'];
        yield 'five bytes, no tail' => ['café', 'mnqwnq5j'];
        yield 'emoji' => ['😀', '6cpzraa'];
        yield 'cjk' => ['日本', '42l2lzu4vq'];
        yield 'mostly ascii with one umlaut' => ['Grüße, Welt!', 'i5zmhpgdt5ssyicxmvwhiii'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('nonSymbolSetMessages')]
    public function testMessagesOutsideTheSymbolSetAreSentAsBase32(string $text, string $expectedWire): void
    {
        [$header, $frameBits] = $this->transmitAndCaptureLog($text);

        $this->assertSame(\sprintf('transmit "%s" as base32 "%s"', $text, $expectedWire), $this->logSubject($header));
        $this->assertSame($expectedWire, $this->decodeFrame($frameBits));
        $this->assertSame($text, $this->base32Decode($expectedWire), 'Wire text should round-trip to the original UTF-8.');
    }

    public function testBase32WireTextStaysClearOfTheDedicatedUppercaseSymbols(): void
    {
        [, $frameBits] = $this->transmitAndCaptureLog('Ünïcödé ✓');

        $wire = $this->decodeFrame($frameBits);
        $this->assertMatchesRegularExpression('/^[a-z2-7]+$/', $wire);
        $this->assertSame('Ünïcödé ✓', $this->base32Decode($wire));
    }

    /**
     * Pushes $text through the page's SSE handler and fast-forwards the fake
     * clock past the whole transmission.
     *
     * @return array{string, string} the log's header line and frame bits
     */
    private function transmitAndCaptureLog(string $text): array
    {
        $page = $this->getPage();
        $page->addInitScript(self::STUB_EVENT_SOURCE);
        $page->clock()->install();
        $this->visit('/?id=fixedid');

        $page->evaluate(<<<'JS'
            (text) => {
                const es = window.__esInstances[window.__esInstances.length - 1];
                es.onmessage({ data: JSON.stringify({ text }) });
            }
            JS, $text);
        // 750 ms per symbol; the longest case here is ~30 symbols.
        $page->clock()->runFor(60_000);

        $logs = array_values(array_filter(
            array_map(static fn ($m) => $m->text(), $page->consoleMessages()),
            static fn (string $t) => str_starts_with($t, 'transmit "'),
        ));
        $this->assertCount(1, $logs, 'Expected exactly one transmit log.');

        $lines = explode("\n", $logs[0]);
        $this->assertCount(2, $lines);

        return [$lines[0], $lines[1]];
    }

    /** Strips the variable `: N samples (…s actual)` suffix from the header. */
    private function logSubject(string $header): string
    {
        $this->assertMatchesRegularExpression('/: \d+ samples \(\d+\.\d{3}s actual\)$/', $header);

        return (string) preg_replace('/: \d+ samples \(.*\)$/', '', $header);
    }

    /**
     * Turns the logged frame bits (one char per bit) back into text, checking
     * the START/CRC/END framing on the way.
     */
    private function decodeFrame(string $frameBits): string
    {
        $this->assertMatchesRegularExpression('/^[01]+$/', $frameBits);
        $this->assertSame(0, \strlen($frameBits) % 6);

        $symbols = array_map('bindec', str_split($frameBits, 6));
        $this->assertSame(0b111111, array_shift($symbols), 'START');
        $this->assertSame(0b000000, array_pop($symbols), 'END');
        $crc = array_pop($symbols);

        $xor = array_reduce($symbols, static fn (int $acc, int $v) => $acc ^ $v, 0);
        $this->assertSame(1 + ($xor % 62), $crc, 'CRC');

        return implode('', array_map(static fn (int $s) => self::SYMBOLS[$s], $symbols));
    }

    private function foldCase(string $text): string
    {
        return preg_replace_callback('/[C-Z]/', static fn (array $m) => strtolower($m[0]), $text);
    }

    private function base32Decode(string $wire): string
    {
        $alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
        $bits = '';
        foreach (str_split($wire) as $c) {
            $bits .= str_pad(decbin(strpos($alphabet, $c)), 5, '0', STR_PAD_LEFT);
        }

        return implode('', array_map(
            static fn (string $byte) => \chr(bindec($byte)),
            str_split(substr($bits, 0, \intdiv(\strlen($bits), 8) * 8), 8),
        ));
    }
}
