import {
  Identifiable,
  Identifier,
  useResource,
  useResourceResponse,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { useEffect, useRef, useContext } from "react";
import {
  Action,
  ResourceBroadcast,
  RevalidationUpdate,
  RealtimeRetrieveRequestProps,
} from "./types";
import { WSContext } from "./Websocket";
import { takeTicket } from "./takeTicket";
import { MutateResponse } from "@pennlabs/rest-hooks/dist/types";

interface useRealtimeResourceResponse<R, E extends any = any>
  extends useResourceResponse<R, E> {
  isConnected: boolean;
}

function useRealtimeResource<R extends Identifiable, E extends any = any>(
  url: string,
  subscribeRequest: RealtimeRetrieveRequestProps<R>,
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
    (
      update: ResourceBroadcast<R> | RevalidationUpdate
    ) => Promise<MutateResponse<R, E>>
  >();

  callbackRef.current = async (
    update: ResourceBroadcast<R> | RevalidationUpdate
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
    websocket
      .subscribe(
        {
          action: "retrieve",
          view_kwargs: {},
          query_params: {},
          ...subscribeRequest,
        },
        callbackRef,
        request_id
      )
      .then();
    return () => websocket.unsubscribe(request_id);
  }, []);

  return { isConnected, ...response };
}

export default useRealtimeResource;
