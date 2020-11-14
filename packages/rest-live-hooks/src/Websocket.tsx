import React, {
  useRef,
  MutableRefObject,
  createContext,
  useState,
  useEffect,
  PropsWithChildren,
} from "react";
import ReconnectingWebSocket, { Options } from "reconnecting-websocket";
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

  connect() {
    const url = this.findOrigin() + this.url;
    this.websocket = new ReconnectingWebSocket(url, undefined, {
      ...this.wsOptions,
    });

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
        this.websocket!.send(JSON.stringify(listener.request));
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
    uuid: number
  ) {
    if (
      this.websocket &&
      this.websocket.readyState === ReconnectingWebSocket.OPEN
    ) {
      this.websocket.send(JSON.stringify(request));
    }

    this.listeners.push({
      request: request,
      notify,
      uuid,
    });
  }

  unsubscribe(uuid: number) {
    if (this.websocket === null) {
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
