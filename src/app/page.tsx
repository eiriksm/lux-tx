"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import "./globals.css";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateId(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

// Protocol: 64 Hz tick rate, 8 samples per bit, 6 bits per symbol, MSB-first
// Frame: [START 111111] [data symbols…] [CRC] [END 000000]
// Bright = 1, Dark = 0
const TICK_MS = 1000 / 64;   // 15.625 ms per tick
const SAMPLES_PER_BIT = 8;   // 8 ticks per bit → 125 ms per bit
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
] as const;

const CHAR_TO_SYMBOL = (() => {
  const table = new Map<string, number>();
  for (let i = 1; i <= 62; i++) table.set(SYMBOLS[i], i);
  for (let code = 67; code <= 90; code++) {
    table.set(String.fromCharCode(code), table.get(String.fromCharCode(code + 32))!);
  }
  return table;
})();

function symbolToBits(sym: number): string {
  return Array.from({ length: BITS_PER_SYMBOL }, (_, i) => (sym >> (BITS_PER_SYMBOL - 1 - i)) & 1)
    .map(bit => bit.toString().repeat(SAMPLES_PER_BIT))
    .join("");
}

function encodeMessage(text: string): string {
  const dataSymbols = Array.from(text)
    .map(c => CHAR_TO_SYMBOL.get(c) ?? 0)
    .filter((sym): sym is number => sym > 0);
  const xor = dataSymbols.reduce((acc, v) => acc ^ v, 0);
  const crc = 1 + (xor % 62);
  const frame = [START, ...dataSymbols, crc, END].map(symbolToBits).join("");
  return "0".repeat(PAD_SAMPLES) + frame + "0".repeat(PAD_SAMPLES);
}

export default function Home() {
  const [bg, setBg] = useState<"white" | "black">("black");
  const [input, setInput] = useState("");
  const activeRef = useRef(false);
  const queueRef = useRef<Array<{ sequence: string; text: string; frameBits: string; frameSamples: number; callbackUrl?: string }>>([]);

  const [id] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || generateId();
  });

  useEffect(() => {
    if (!id) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("id") !== id) {
      url.searchParams.set("id", id);
      window.history.replaceState({}, "", url.toString());
    }
  }, [id]);

  const pulse = useCallback((sequence: string, text: string, frameBits: string, frameSamples: number, callbackUrl?: string) => {
    if (activeRef.current) {
      queueRef.current.push({ sequence, text, frameBits, frameSamples, callbackUrl });
      return;
    }
    activeRef.current = true;
    const startedAt = performance.now();

    sequence.split("").forEach((bit, i) => {
      setTimeout(() => setBg(bit === "1" ? "white" : "black"), i * TICK_MS);
    });

    setTimeout(() => {
      activeRef.current = false;
      setBg("black");
      const elapsedMs = performance.now() - startedAt;
      const log = `transmit "${text}": ${frameSamples} samples (${(elapsedMs / 1000).toFixed(3)}s actual)\n${frameBits}`;
      console.log(log);

      if (callbackUrl) {
        fetch(callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, text, response: "ack" }),
        });
      }

      const next = queueRef.current.shift();
      if (next) pulse(next.sequence, next.text, next.frameBits, next.frameSamples, next.callbackUrl);
    }, sequence.length * TICK_MS);
  }, [id]);

  const transmit = useCallback(
    (text: string, callbackUrl?: string) => {
      const seq = encodeMessage(text);
      const frame = seq.slice(PAD_SAMPLES, seq.length - PAD_SAMPLES);
      const bits = frame.match(/.{8}/g)!.map(s => s[0]).join("");
      pulse(seq, text, bits, frame.length, callbackUrl);
    },
    [pulse]
  );

  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`/api/transmit?id=${id}`);
    es.onmessage = (event) => {
      const { text, callbackUrl } = JSON.parse(event.data);
      transmit(text, callbackUrl);
    };
    return () => es.close();
  }, [id, transmit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "h") transmit("hi");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transmit]);

  const send = useCallback(() => {
    if (!input) return;
    fetch(`/api/transmit?id=${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });
    setInput("");
  }, [id, input]);

  const isBlack = bg === "black";
  const borderColor = isBlack ? "white" : "black";

  return (
    <div
      className="screen"
      style={{
        backgroundColor: bg,
        color: isBlack ? "white" : "black",
        ["--border-color" as string]: borderColor,
      }}
    >
      <div className="composer">
        <input
          className="composerInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="type message…"
        />
        <button
          className="composerButton"
          onClick={send}
        >
          Send
        </button>
        <button
          className="composerButton"
          onClick={() => {
            const offsetMs = (PAD_SAMPLES + BITS_PER_SYMBOL * SAMPLES_PER_BIT) * TICK_MS;
            fetch(`/api/transmit?id=${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: String(Math.floor((Date.now() + offsetMs) / 1000)) }),
            });
          }}
        >
          Timestamp
        </button>
        <span className="channelId">{id}</span>
      </div>
    </div>
  );
}
