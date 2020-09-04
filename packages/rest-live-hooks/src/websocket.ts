import { ResourceUpdate, SubscribeRequest } from "./types";
import { Identifiable } from "@pennlabs/rest-hooks";

type UpdateListener = {
  model: string;
  notify: (update: ResourceUpdate<any>) => void;
};

class WebsocketManager {
  private listeners: UpdateListener[];
  private websocket: WebSocket;

  constructor(url: string) {
    this.listeners = [];
    this.websocket = new WebSocket(url);
    this.websocket.onopen = () => {};
    this.websocket.onerror = () => {};
    this.websocket.onclose = () => {};
    this.websocket.onmessage = (event: MessageEvent) => {
      if (event.data.model) {
        const update = event.data as ResourceUpdate<any>;
        this.listeners
          .filter((listener) => listener.model === update.model)
          .forEach((listener) => listener.notify(update));
      }
    };
  }

  subscribe<T extends Identifiable>(
    request: SubscribeRequest,
    notify: (update: ResourceUpdate<T>) => void
  ): number {
    this.websocket.send(JSON.stringify(request));
    this.listeners.push({
      model: request.model,
      notify,
    });
    return 0;
  }

  unsubscribe(id: number) {}
}

export const websocket = new WebsocketManager("/ws/subscribe/");
