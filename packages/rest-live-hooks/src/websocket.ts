import { ResourceUpdate, SubscribeRequest } from "./types";
import { Identifiable } from "@pennlabs/rest-hooks";
import { MutableRefObject } from "react";
import { SITE_ORIGIN } from "./findOrigin";

type UpdateListener = {
  request: SubscribeRequest<any>;
  notify: MutableRefObject<
    (update: ResourceUpdate<any>) => Promise<any[] | any>
  >;
  uuid: number;
};

class WebsocketManager {
  private listeners: UpdateListener[];
  private websocket: WebSocket | null;
  private connectionComplete: Promise<boolean>;
  private setConnected: (value?: boolean | PromiseLike<boolean>) => void;
  private readonly url: string;

  connect(): Promise<void> {
    const url = SITE_ORIGIN() + this.url;
    return new Promise<void>((resolve, _reject) => {
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
              update.group_key_value === listener.request.value
          );
          relevantListeners.forEach((listener) =>
            listener.notify.current(update)
          );
        }
      };
      this.websocket.onopen = () => {
        this.setConnected(true);
        resolve();
      };
    });
  }
  constructor(url: string) {
    this.listeners = [];
    this.websocket = null;
    this.url = url;
    this.connectionComplete = new Promise<boolean>((resolve) => {
      this.setConnected = resolve;
    });
  }

  reset() {
    this.listeners = [];
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  async subscribe<T extends Identifiable>(
    request: SubscribeRequest<T>,
    notify: MutableRefObject<(update: ResourceUpdate<T>) => Promise<void>>,
    uuid: number
  ) {
    if (this.websocket === null) {
      await this.connect();
    } else {
      await this.connectionComplete;
    }

    // this.websocket is non-null since connection has completed
    this.websocket!.send(JSON.stringify(request));
    this.listeners.push({
      request: request,
      notify,
      uuid,
    });
  }

  unsubscribe(uuid: number) {
    if (!this.websocket) {
      throw new Error(
        "Unsubscribe cannot be called if no connection has been established"
      );
    }
    const listener = this.listeners.find((l) => l.uuid == uuid);
    if (!listener) {
      throw new Error("invalid uuid");
    }

    const request = listener.request;
    this.websocket.send(JSON.stringify({ ...request, unsubscribe: true }));
    this.listeners = this.listeners.filter((l) => l.uuid !== uuid);
  }
}

export const takeTicket = (() => {
  let count = 0;
  return () => count++;
})();
export const websocket = new WebsocketManager("/api/ws/subscribe/");
