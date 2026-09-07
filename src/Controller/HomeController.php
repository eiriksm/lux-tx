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
<body class="bg-black text-white antialiased">
<!-- Mobile first: full-height column, textarea takes the room that's left. -->
<form
  id="composer"
  autocomplete="off"
  class="flex min-h-screen min-h-[100dvh] flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:mx-auto sm:w-full sm:max-w-2xl sm:justify-center"
>
  <textarea
    id="input"
    rows="3"
    placeholder="type message…"
    autocapitalize="none"
    autocomplete="off"
    spellcheck="false"
    class="min-h-32 w-full flex-1 resize-none rounded-none border-2 border-white bg-transparent p-4 text-lg leading-relaxed outline-none placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-40 sm:flex-none sm:text-2xl"
  ></textarea>

  <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
    <button
      id="sendBtn"
      type="submit"
      class="flex min-h-14 cursor-pointer items-center justify-center rounded-none border-2 border-white bg-transparent px-4 py-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-50 sm:flex-1 sm:text-xl"
    >Send</button>
    <button
      id="timestampBtn"
      type="button"
      class="flex min-h-14 cursor-pointer items-center justify-center rounded-none border-2 border-white bg-transparent px-4 py-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-50 sm:flex-1 sm:text-xl"
    >Timestamp</button>
    <button
      id="listenBtn"
      type="button"
      class="flex min-h-14 cursor-pointer items-center justify-center rounded-none border-2 border-white bg-transparent px-4 py-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-50 sm:flex-1 sm:text-xl"
    >
      <span id="listenDot" aria-hidden="true" class="mr-2 h-2.5 w-2.5 rounded-full bg-white/35"></span><span id="listenLabel">Listen</span>
    </button>
    <span
      id="channelId"
      class="flex items-center justify-center px-2 font-mono text-base tracking-[0.15em] opacity-50 select-all sm:text-xl"
    ></span>
  </div>
</form>

<!-- The transmit flash owns the whole viewport, so the UI never strobes with it. -->
<div id="flash" aria-hidden="true" class="fixed inset-0 z-10 hidden bg-black"></div>
<script type="module" src="/assets/app.js"></script>
</body>
</html>
HTML;

        return new Response($html);
    }
}
