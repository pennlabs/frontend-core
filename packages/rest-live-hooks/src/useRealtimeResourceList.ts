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
  ResourceUpdate,
  SubscribeRequest,
  RevalidationUpdate,
} from "./types";
import { takeTicket, RLHContext } from "./websocket";

interface useRealtimeResourceListResponse<R extends Identifiable>
  extends useResourceListResponse<R> {
  isConnected: boolean;
}

function useRealtimeResourceList<R extends Identifiable, K extends keyof R>(
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  subscribeRequest: SubscribeRequest<R, K>,
  config?: ConfigInterface<R[]> & { orderBy?: (a: R, b: R) => number }
): useRealtimeResourceListResponse<R> {
  const contextProps = useContext(RLHContext);

  if (!contextProps) {
    throw new Error("useRealtimeResourceList must be used with an RLHInstance");
  }

  const { websocket, isConnected } = contextProps;

  const orderBy = config?.orderBy;
  if (config) {
    delete config.orderBy;
  }

  const response = useResourceList(listUrl, getResourceUrl, config);
  const { mutate } = response;
  const callbackRef = useRef<
    (update: ResourceUpdate<R> | RevalidationUpdate) => Promise<R[]>
  >();

  callbackRef.current = async (
    update: ResourceUpdate<R> | RevalidationUpdate
  ) => {
    switch (update.action) {
      case Action.CREATED:
        return mutate(update.instance.id, update.instance, {
          sendRequest: false,
          revalidate: false,
          append: true,
          sortBy: orderBy,
        });
      case Action.UPDATED:
        return mutate(update.instance.id, update.instance, {
          sendRequest: false,
          revalidate: false,
        });
      case Action.DELETED:
        return mutate(update.instance.id, null, {
          sendRequest: false,
          revalidate: false,
        });
      case "REVALIDATE":
        return mutate(undefined, undefined, { sendRequest: false });
    }
  };

  useEffect(() => {
    const uuid = takeTicket();
    websocket.subscribe(subscribeRequest, callbackRef, uuid).then();
    return () => websocket.unsubscribe(uuid);
  }, []);

  return { isConnected, ...response };
}

export default useRealtimeResourceList;
