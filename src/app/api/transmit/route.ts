import { addClient, removeClient, broadcast } from "./clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      addClient(id, controller);
    },
    cancel() {
      removeClient(id, controller);
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
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  const body = await request.json();
  const text = body.text;

  if (!text || typeof text !== "string") {
    return Response.json({ error: "invalid text" }, { status: 400 });
  }

  broadcast(id, text);
  return Response.json({ ok: true, id, text });
}
