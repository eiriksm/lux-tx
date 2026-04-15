type Client = ReadableStreamDefaultController;

const clients = new Set<Client>();

export function addClient(controller: Client) {
  clients.add(controller);
}

export function removeClient(controller: Client) {
  clients.delete(controller);
}

export function broadcast(char: string) {
  for (const controller of clients) {
    controller.enqueue(`data: ${char}\n\n`);
  }
}
