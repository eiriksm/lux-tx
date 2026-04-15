import { addClient, removeClient, broadcast } from "./clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      addClient(controller);
    },
    cancel() {
      removeClient(controller);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const text = body.text;

  if (!text || typeof text !== "string") {
    return Response.json({ error: "invalid text" }, { status: 400 });
  }

  broadcast(text);
  return Response.json({ ok: true, text });
}
