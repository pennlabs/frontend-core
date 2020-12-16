import React, {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import ReconnectingWebSocket, { Options } from "reconnecting-websocket";
import {
  ResourceUpdate,
  RevalidationUpdate,
  SubscribeRequest,
  UpdateListener,
} from "./types";
import { Identifiable } from "@pennlabs/rest-hooks";
import { SITE_ORIGIN } from "./findOrigin";

export type WSContextProps = {
  websocket: WebsocketManager;
  isConnected: boolean;
};

export const WSContext = createContext<WSContextProps | undefined>(undefined);

export function WebsocketProvider({
  url,
  options,
  findOrigin,
  children,
}: PropsWithChildren<{
  url: string;
  findOrigin?: () => string;
  options?: Partial<Options>;
}>) {
  const [isConnected, setIsConnected] = useState(true);
  const websocketRef = useRef(
    new WebsocketManager(url, setIsConnected, findOrigin, options)
  );

  useEffect(() => {
    websocketRef.current.connect();
    return () => {
      websocketRef.current.reset();
    };
  }, []);

  return (
    <WSContext.Provider
      value={{ websocket: websocketRef.current, isConnected }}
    >
      {children}
    </WSContext.Provider>
  );
}

class WebsocketManager {
  private listeners: UpdateListener[];
  private websocket: ReconnectingWebSocket | null;
  private readonly url: string;
  private readonly findOrigin: () => string;
  private isConnectedCallback: (isConnected: boolean) => any;
  private readonly wsOptions: Partial<Options>;

  sendSubscriptionFor(listener: UpdateListener) {
    this.websocket!.send(
      JSON.stringify({
        type: "subscribe",
        request_id: listener.request_id,
        ...listener.request,
      })
    );
  }

  connect() {
    const url = this.findOrigin() + this.url;
    this.websocket = new ReconnectingWebSocket(url, undefined, {
      ...this.wsOptions,
    });

    this.websocket.addEventListener("message", (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.model) {
        const update = message as ResourceUpdate<any>;
        this.listeners
          .find((listener) => listener.request_id === update.request_id)
          ?.notify?.current(update);
      }
    });
    this.websocket.addEventListener("error", () => {
      this.isConnectedCallback(false);
    });
    this.websocket.addEventListener("close", () => {
      this.isConnectedCallback(false);
    });
    this.websocket.addEventListener("open", () => {
      // NOTE: This operates under the assumption that no consumer will
      // subscribe before the connection is open
      this.listeners.forEach((listener) => {
        // if websocket is open then it cannot be null
        this.sendSubscriptionFor(listener);
        listener.notify.current({ action: "REVALIDATE" });
      });
      this.isConnectedCallback(true);
    });
  }
  constructor(
    url: string,
    isConnectedCallback: (isConnected: boolean) => any,
    findOrigin?: () => string,
    options?: Partial<Options>
  ) {
    this.listeners = [];
    this.websocket = null;
    this.url = url;
    this.isConnectedCallback = isConnectedCallback;
    this.findOrigin = findOrigin || SITE_ORIGIN;
    this.wsOptions = options || {};
  }

  reset() {
    this.isConnectedCallback = () => {};
    this.websocket?.close();
  }

  async subscribe<T extends Identifiable>(
    request: SubscribeRequest<T>,
    notify: MutableRefObject<
      (update: ResourceUpdate<T> | RevalidationUpdate) => Promise<T[] | T>
    >,
    request_id: number
  ) {
    const listener = { request, notify, request_id };
    if (
      this.websocket &&
      this.websocket.readyState === ReconnectingWebSocket.OPEN
    ) {
      this.sendSubscriptionFor(listener);
    }

    this.listeners.push(listener);
  }

  unsubscribe(request_id: number) {
    if (this.websocket === null) {
      throw new Error(
        "Unsubscribe cannot be called if no connection has been established"
      );
    }
    this.websocket.send(JSON.stringify({ type: "unsubscribe", request_id }));
    this.listeners = this.listeners.filter((l) => l.request_id !== request_id);
  }
}
