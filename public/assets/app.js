import { createFeskDecoder } from "./vendor/fesk-rt/fesk-rt.js";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateId() {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

// Protocol: 64 Hz tick rate, 8 samples per bit, 6 bits per symbol, MSB-first
// Frame: [START 111111] [data symbols…] [CRC] [END 000000]
// Bright = 1, Dark = 0
const TICK_MS = 1000 / 64; // 15.625 ms per tick
const SAMPLES_PER_BIT = 8; // 8 ticks per bit → 125 ms per bit
const BITS_PER_SYMBOL = 6;
const START = 0b111111;
const END = 0b000000;
const PAD_SAMPLES = 12;

const SYMBOLS = [
  "",
  ..."abcdefghijklmnopqrstuvwxyz",
  " ",
  ..."0123456789",
  ".", ",", "!", "?", "'", "-", ":", ";", "(", ")", "/",
  "@", "#", "&", "+", "=", "_", "~", "*", '"', "%", "\n",
  "A", "B",
  "\\",
];

const CHAR_TO_SYMBOL = (() => {
  const table = new Map();
  for (let i = 1; i <= 62; i++) table.set(SYMBOLS[i], i);
  for (let code = 67; code <= 90; code++) {
    table.set(String.fromCharCode(code), table.get(String.fromCharCode(code + 32)));
  }
  return table;
})();

function symbolToBits(sym) {
  return Array.from({ length: BITS_PER_SYMBOL }, (_, i) => (sym >> (BITS_PER_SYMBOL - 1 - i)) & 1)
    .map((bit) => bit.toString().repeat(SAMPLES_PER_BIT))
    .join("");
}

function encodeMessage(text) {
  const dataSymbols = Array.from(text)
    .map((c) => CHAR_TO_SYMBOL.get(c) ?? 0)
    .filter((sym) => sym > 0);
  const xor = dataSymbols.reduce((acc, v) => acc ^ v, 0);
  const crc = 1 + (xor % 62);
  const frame = [START, ...dataSymbols, crc, END].map(symbolToBits).join("");
  return "0".repeat(PAD_SAMPLES) + frame + "0".repeat(PAD_SAMPLES);
}

const screen = document.getElementById("screen");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const timestampBtn = document.getElementById("timestampBtn");
const listenBtn = document.getElementById("listenBtn");
const listenDot = document.getElementById("listenDot");
const listenLabel = document.getElementById("listenLabel");
const channelIdEl = document.getElementById("channelId");

let bg = "black";
let listenState = "idle";
let active = false;
const queue = [];
let decoder = null;
let mediaStream = null;
let listenStarting = false;
const pendingResponses = [];
let currentId = "";

function renderScreen() {
  const isBlack = bg === "black";
  screen.style.backgroundColor = bg;
  screen.style.color = isBlack ? "white" : "black";
  screen.style.setProperty("--border-color", isBlack ? "white" : "black");
}

function renderListenState() {
  listenDot.dataset.state = listenState;
  listenBtn.disabled = listenState === "starting";
  listenLabel.textContent =
    listenState === "listening" ? "Stop" :
    listenState === "starting" ? "Starting…" :
    listenState === "error" ? "Retry" : "Listen";
}

function setListenState(next) {
  listenState = next;
  renderListenState();
}

function sendCallback(url, text, response) {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: currentId, text, response }),
  });
}

function stopListening() {
  decoder?.stop().catch((err) => console.error("decoder.stop failed", err));
  mediaStream?.getTracks().forEach((t) => t.stop());
  decoder = null;
  mediaStream = null;
  setListenState("idle");
}

async function startListening() {
  if (decoder || listenStarting) return;
  listenStarting = true;
  setListenState("starting");
  try {
    const d = createFeskDecoder({
      workletUrl: new URL("/assets/vendor/fesk-rt/mb-fesk-worklet.js", window.location.origin),
    });
    d.events.on("preview", (e) => {
      console.log("[fesk preview]", {
        pipeline: e.pipelineKey,
        text: e.text,
        provisional: e.provisional,
        crcOk: e.crcOk,
        confidence: e.confidence,
      });
    });
    d.events.on("frame", (e) => {
      const result = e.result;
      console.log("[fesk frame]", { pipeline: e.pipelineKey, label: e.label, result });
      if (!result?.ok || !result.crcOk || !result.text) return;
      const next = pendingResponses.shift();
      if (!next) return;
      clearTimeout(next.timer);
      sendCallback(next.callbackUrl, next.text, result.text);
    });
    await d.prepare();
    await d.waitForReady();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { exact: 1 },
        googEchoCancellation: false,
        googNoiseSuppression: false,
        googAutoGainControl: false,
        googHighpassFilter: false,
      },
    });
    await d.attachStream(stream);
    decoder = d;
    mediaStream = stream;
    setListenState("listening");
  } catch (err) {
    console.error("listen failed", err);
    setListenState("error");
  } finally {
    listenStarting = false;
  }
}

window.addEventListener("beforeunload", () => {
  decoder?.stop();
  mediaStream?.getTracks().forEach((t) => t.stop());
});

function pulse(sequence, text, frameBits, frameSamples, callbackUrl) {
  if (active) {
    queue.push({ sequence, text, frameBits, frameSamples, callbackUrl });
    return;
  }
  active = true;
  const startedAt = performance.now();

  sequence.split("").forEach((bit, i) => {
    setTimeout(() => {
      bg = bit === "1" ? "white" : "black";
      renderScreen();
    }, i * TICK_MS);
  });

  setTimeout(() => {
    active = false;
    bg = "black";
    renderScreen();
    const elapsedMs = performance.now() - startedAt;
    const log = `transmit "${text}": ${frameSamples} samples (${(elapsedMs / 1000).toFixed(3)}s actual)\n${frameBits}`;
    console.log(log);

    if (callbackUrl) {
      const entry = {
        callbackUrl,
        text,
        timer: setTimeout(() => {
          const idx = pendingResponses.indexOf(entry);
          if (idx < 0) return;
          pendingResponses.splice(idx, 1);
          sendCallback(callbackUrl, text, null);
        }, 60_000),
      };
      pendingResponses.push(entry);
    }

    const next = queue.shift();
    if (next) pulse(next.sequence, next.text, next.frameBits, next.frameSamples, next.callbackUrl);
  }, sequence.length * TICK_MS);
}

function transmit(text, callbackUrl) {
  const seq = encodeMessage(text);
  const frame = seq.slice(PAD_SAMPLES, seq.length - PAD_SAMPLES);
  const bits = frame.match(/.{8}/g).map((s) => s[0]).join("");
  pulse(seq, text, bits, frame.length, callbackUrl);
}

function send() {
  const text = input.value;
  if (!text) return;
  fetch(`/api/transmit?id=${currentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  input.value = "";
}

sendBtn.addEventListener("click", send);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") send();
});

timestampBtn.addEventListener("click", () => {
  const offsetMs = (PAD_SAMPLES + BITS_PER_SYMBOL * SAMPLES_PER_BIT) * TICK_MS;
  fetch(`/api/transmit?id=${currentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: String(Math.floor((Date.now() + offsetMs) / 1000)) }),
  });
});

listenBtn.addEventListener("click", () => {
  if (listenState === "listening") stopListening();
  else startListening();
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "h") transmit("hi");
});

(function init() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("id") || generateId();
  currentId = next;
  const url = new URL(window.location.href);
  if (url.searchParams.get("id") !== next) {
    url.searchParams.set("id", next);
    window.history.replaceState({}, "", url.toString());
  }
  channelIdEl.textContent = currentId;

  renderScreen();
  renderListenState();

  const es = new EventSource(`/api/transmit?id=${currentId}`);
  es.onmessage = (event) => {
    const { text, callbackUrl } = JSON.parse(event.data);
    transmit(text, callbackUrl);
  };
})();
