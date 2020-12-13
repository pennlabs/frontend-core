import {
  Identifiable,
  useResource,
  useResourceResponse,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { useEffect, useRef, useContext } from "react";
import {
  Action,
  ResourceUpdate,
  SubscribeRequest,
  RevalidationUpdate,
} from "./types";
import { WSContext } from "./Websocket";
import { takeTicket } from "./takeTicket";

interface useRealtimeResourceResponse<R> extends useResourceResponse<R> {
  isConnected: boolean;
}

function useRealtimeResource<R extends Identifiable>(
  url: string,
  subscribeRequest: SubscribeRequest<R>,
  config?: ConfigInterface<R>
): useRealtimeResourceResponse<R> {
  const contextProps = useContext(WSContext);

  if (!contextProps) {
    throw new Error(
      "useRealtimeResource must be wrapped by an WebsocketProvider"
    );
  }

  const { websocket, isConnected } = contextProps;

  const response = useResource(url, config);
  const { mutate } = response;
  const callbackRef = useRef<
    (update: ResourceUpdate<R> | RevalidationUpdate) => Promise<R>
  >();

  callbackRef.current = async (
    update: ResourceUpdate<R> | RevalidationUpdate
  ) => {
    const mutateOptions = { sendRequest: false, revalidate: false };
    switch (update.action) {
      case Action.CREATED:
        // This case shouldn't be hit: you should never subscribe to updates
        // on an instance that hasn't yet been created
        break;
      case Action.UPDATED:
        return mutate(update.instance, mutateOptions);
      // How do we want to handle deletion of a single object?
      case Action.DELETED:
        return mutate(undefined, mutateOptions);
      case "REVALIDATE":
        return mutate(undefined, { sendRequest: false });
    }
  };
  useEffect(() => {
    const request_id = takeTicket();
    websocket.subscribe(subscribeRequest, callbackRef, request_id).then();
    return () => websocket.unsubscribe(request_id);
  }, []);

  return { isConnected, ...response };
}

export default useRealtimeResource;
