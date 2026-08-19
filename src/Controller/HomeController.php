<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController]
class HomeController
{
    #[Route('/', name: 'home', methods: ['GET'])]
    public function index(): Response
    {
        $html = <<<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>lux-tx</title>
<link rel="stylesheet" href="/assets/app.css">
</head>
<body>
<div class="screen" id="screen">
  <div class="composer">
    <input class="composerInput" id="input" placeholder="type message…" autocomplete="off">
    <button class="composerButton" id="sendBtn">Send</button>
    <button class="composerButton" id="timestampBtn">Timestamp</button>
    <button class="composerButton" id="listenBtn">
      <span class="listenDot" id="listenDot" data-state="idle" aria-hidden="true"></span><span id="listenLabel">Listen</span>
    </button>
    <span class="channelId" id="channelId"></span>
  </div>
</div>
<script type="module" src="/assets/app.js"></script>
</body>
</html>
HTML;

        return new Response($html);
    }
}
