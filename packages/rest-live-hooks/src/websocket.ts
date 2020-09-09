import { ResourceUpdate, SubscribeRequest } from "./types";
import { Identifiable } from "@pennlabs/rest-hooks";
import { MutableRefObject } from "react";
import { SITE_ORIGIN } from "./findOrigin";

type UpdateListener = {
  request: SubscribeRequest<any>;
  notify: MutableRefObject<
    (update: ResourceUpdate<any>) => Promise<any[] | any>
  >;
};

class WebsocketManager {
  private listeners: UpdateListener[];
  private websocket: WebSocket | null;
  private readonly url: string;

  connect(): Promise<void> {
    const url = SITE_ORIGIN() + this.url;
    return new Promise<void>((resolve, reject) => {
      this.websocket = new WebSocket(url);
      this.websocket.onerror = () => {};
      this.websocket.onclose = () => {};
      this.websocket.onmessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.model) {
          const update = message as ResourceUpdate<any>;
          const relevantListeners = this.listeners.filter(
            (listener) =>
              listener.request.model === update.model &&
              update.instance[listener.request.property || "id"] ===
                listener.request.value
          );
          relevantListeners.forEach((listener) =>
            listener.notify.current(update)
          );
        }
      };
      this.websocket.onopen = () => {
        resolve();
      };
    });
  }
  constructor(url: string) {
    this.listeners = [];
    this.websocket = null;
    this.url = url;
  }

  reset() {
    this.listeners = [];
    this.websocket.close();
    this.websocket = null;
  }

  async subscribe<T extends Identifiable>(
    request: SubscribeRequest<T>,
    notify: MutableRefObject<(update: ResourceUpdate<T>) => Promise<T[] | T>>
  ): Promise<number> {
    if (this.websocket === null) {
      await this.connect();
    }
    this.websocket.send(JSON.stringify(request));
    this.listeners.push({
      request: request,
      notify,
    });
    return 0;
  }

  unsubscribe(id: number) {}
}

export const websocket = new WebsocketManager("/ws/subscribe/");
