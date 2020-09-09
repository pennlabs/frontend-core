import {
  Identifiable,
  Identifier,
  useResourceList,
  useResourceListResponse,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { useEffect, useRef } from "react";
import { Action, ResourceUpdate, SubscribeRequest } from "./types";
import { takeTicket, websocket } from "./websocket";

function useRealtimeResourceList<R extends Identifiable, K extends keyof R>(
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  subscribeRequest: SubscribeRequest<R, K>,
  config?: ConfigInterface<R[]> & { orderBy?: (a: R, b: R) => number }
): useResourceListResponse<R> {
  const { orderBy } = config;
  delete config.orderBy;

  const response = useResourceList(listUrl, getResourceUrl, config);
  const { mutate } = response;
  const callbackRef = useRef<(update: ResourceUpdate<R>) => Promise<R[]>>();

  callbackRef.current = async (update: ResourceUpdate<R>) => {
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
    }
  };

  useEffect(() => {
    const uuid = takeTicket();
    websocket.subscribe(subscribeRequest, callbackRef, uuid).then();
    return () => websocket.unsubscribe(uuid);
  }, []);

  return response;
}

export default useRealtimeResourceList;
