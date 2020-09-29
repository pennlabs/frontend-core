import React, {
  useRef,
  MutableRefObject,
  createContext,
  ReactNode,
  useState,
} from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { ResourceUpdate, RevalidationUpdate, SubscribeRequest } from "./types";
import { Identifiable } from "@pennlabs/rest-hooks";
import { SITE_ORIGIN } from "./findOrigin";

type UpdateListener = {
  request: SubscribeRequest<any>;
  notify: MutableRefObject<
    (update: ResourceUpdate<any> | RevalidationUpdate) => Promise<any[] | any>
  >;
  uuid: number;
};

export type RLHContextProps = {
  websocket: WebsocketManager;
  isConnected: boolean;
};

export const RLHContext = createContext<RLHContextProps | undefined>(undefined);

export function RLHInstance({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const websocketRef = useRef(
    new WebsocketManager("/api/ws/subscribe/", setIsConnected)
  );

  return (
    <RLHContext.Provider
      value={{ websocket: websocketRef.current, isConnected }}
    >
      {children}
    </RLHContext.Provider>
  );
}

class WebsocketManager {
  private listeners: UpdateListener[];
  private websocket: ReconnectingWebSocket | null;
  private connectionComplete: Promise<boolean>;
  private setConnected: (value?: boolean | PromiseLike<boolean>) => void;
  private readonly url: string;
  private isConnectedCallback: (isConnected: boolean) => any;

  connect(): Promise<void> {
    const url = SITE_ORIGIN() + this.url;
    return new Promise<void>((resolve, _reject) => {
      this.websocket = new ReconnectingWebSocket(url);
      this.websocket.addEventListener("message", (event: MessageEvent) => {
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
      });

      // Closed/Error event handlers set connectionComplete to be a promise
      // that won't resolve until the connection is reopened to prevent
      // subscriptions from going through until the connection has been opened.
      //
      // NOTE: This is necessary since the subscribe request will fail
      // since it calls send directly on the socket connection which will
      // throw an error.

      this.websocket.addEventListener("error", () => {
        this.isConnectedCallback(false);
        this.connectionComplete = new Promise<boolean>((resolve) => {
          this.setConnected = resolve;
        });
      });

      this.websocket.addEventListener("close", () => {
        this.isConnectedCallback(false);
        this.connectionComplete = new Promise<boolean>((resolve) => {
          this.setConnected = resolve;
        });
      });

      this.websocket.addEventListener("open", () => {
        // NOTE: This operates under the assumption that no subscription will
        // arrive before open is done iterating through the listeners, since
        // buffered messages will be sent twice otherwise

        this.listeners.forEach((listener) => {
          listener.notify.current({ action: "REVALIDATE" });
          // if websocket is open then it cannot be null
          this.websocket!.send(JSON.stringify(listener.request));
        });
        this.isConnectedCallback(true);
        this.setConnected(true);
        resolve();
      });
    });
  }
  constructor(url: string, isConnectedCallback: (isConnected: boolean) => any) {
    this.listeners = [];
    this.websocket = null;
    this.url = url;
    this.connectionComplete = new Promise<boolean>((resolve) => {
      this.setConnected = resolve;
    });
    this.isConnectedCallback = isConnectedCallback;
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
    notify: MutableRefObject<
      (update: ResourceUpdate<T> | RevalidationUpdate) => Promise<T[] | T>
    >,
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
