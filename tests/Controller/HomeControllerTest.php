<?php

namespace App\Tests\Controller;

use App\Controller\HomeController;
use PHPUnit\Framework\TestCase;

class HomeControllerTest extends TestCase
{
    public function testRendersSuccessfully(): void
    {
        $controller = new HomeController('abc1234', 'v1');
        $response = $controller->index();

        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('<title>lux-tx</title>', $response->getContent());
    }

    public function testEscapesDeployHashForHtml(): void
    {
        $controller = new HomeController('<script>alert(1)</script>', 'v1');
        $content = $controller->index()->getContent();

        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $content);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $content);
    }

    public function testUrlEncodesAssetVersionForBothStylesheetAndScript(): void
    {
        $controller = new HomeController('deadbeef', 'a b/c');
        $content = $controller->index()->getContent();

        $this->assertStringContainsString('href="/assets/app.css?v=a%20b%2Fc"', $content);
        $this->assertStringContainsString('src="/assets/app.js?v=a%20b%2Fc"', $content);
    }

    public function testPlainDeployHashIsRenderedInFooter(): void
    {
        $controller = new HomeController('deadbeef', 'v1');
        $content = $controller->index()->getContent();

        $this->assertStringContainsString('<footer class="text-center font-mono text-xs tracking-[0.15em] opacity-30 select-all">deadbeef</footer>', $content);
    }
}
