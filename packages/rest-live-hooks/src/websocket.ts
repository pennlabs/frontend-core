import { ResourceUpdate, SubscribeRequest } from "./types";
import { Identifiable } from "@pennlabs/rest-hooks";
import { MutableRefObject } from "react";

type UpdateListener = {
  request: SubscribeRequest;
  notify: MutableRefObject<
    (update: ResourceUpdate<any>) => Promise<any[] | any>
  >;
};

export const SITE_ORIGIN = (): string =>
  typeof window !== "undefined"
    ? window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
      ? `ws://${window.location.host}`
      : `wss://${window.location.host}`
    : "";

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
              update.instance[listener.request.property] ===
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

  async subscribe<T extends Identifiable>(
    request: SubscribeRequest,
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
