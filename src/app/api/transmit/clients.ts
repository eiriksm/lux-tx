type Client = ReadableStreamDefaultController;

const channels = new Map<string, Set<Client>>();

export function addClient(id: string, controller: Client) {
  if (!channels.has(id)) channels.set(id, new Set());
  channels.get(id)!.add(controller);
}

export function removeClient(id: string, controller: Client) {
  const ch = channels.get(id);
  if (!ch) return;
  ch.delete(controller);
  if (ch.size === 0) channels.delete(id);
}

export function broadcast(id: string, text: string) {
  const ch = channels.get(id);
  if (!ch) return;
  for (const controller of ch) {
    controller.enqueue(`data: ${text}\n\n`);
  }
}
