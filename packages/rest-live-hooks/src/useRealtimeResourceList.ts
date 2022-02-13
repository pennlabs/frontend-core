import {
  Identifiable,
  Identifier,
  useResourceList,
  useResourceListResponse,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { useEffect, useRef, useContext } from "react";
import {
  Action,
  ResourceBroadcast,
  RealtimeListRequestProps,
  RevalidationUpdate,
} from "./types";
import { WSContext } from "./Websocket";
import { takeTicket } from "./takeTicket";
import { MutateResponse } from "@pennlabs/rest-hooks/dist/types";

interface useRealtimeResourceListResponse<R extends Identifiable, E>
  extends useResourceListResponse<R, E> {
  isConnected: boolean;
}

function useRealtimeResourceList<
  R extends Identifiable,
  K extends keyof R,
  E extends Object
>(
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  subscribeRequest: RealtimeListRequestProps,
  config?: ConfigInterface<R[]> & { orderBy?: (a: R, b: R) => number }
): useRealtimeResourceListResponse<R, E> {
  const contextProps = useContext(WSContext);

  if (!contextProps) {
    throw new Error(
      "useRealtimeResourceList must be used with an WebsocketProvider"
    );
  }

  const { websocket, isConnected } = contextProps;

  const orderBy = config?.orderBy;
  if (config) {
    delete config.orderBy;
  }

  const response = useResourceList<R, E>(listUrl, getResourceUrl, config);
  const { mutate } = response;
  const callbackRef = useRef<
    (
      update: ResourceBroadcast<R> | RevalidationUpdate
    ) => Promise<MutateResponse<R[], E>>
  >();

  callbackRef.current = async (
    update: ResourceBroadcast<R> | RevalidationUpdate
  ) => {
    switch (update.action) {
      case Action.CREATED:
        return mutate(update.instance, {
          method: "POST",
          sendRequest: false,
          revalidate: false,
          sortBy: orderBy,
        });
      case Action.UPDATED:
        return mutate(update.instance, {
          method: "PATCH",
          id: update.instance.id,
          sendRequest: false,
          revalidate: false,
        });
      case Action.DELETED:
        return mutate(null, {
          method: "DELETE",
          id: update.instance.id,
          sendRequest: false,
          revalidate: false,
        });
      case "REVALIDATE":
        // what on earth bro
        return mutate();
    }
  };

  useEffect(() => {
    const request_id = takeTicket();
    websocket
      .subscribe(
        {
          action: "list",
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

export default useRealtimeResourceList;
