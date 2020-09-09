import {
  Identifiable,
  Identifier,
  useResourceList,
  useResourceListResponse,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { useEffect, useRef } from "react";
import { Action, ResourceUpdate, SubscribeRequest } from "./types";
import { websocket } from "./websocket";

function useRealtimeResourceList<R extends Identifiable, K extends keyof R>(
  modelLabel: string,
  listId: Identifier,
  groupField: K,
  orderBy: (a: R, b: R) => number,
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  config?: ConfigInterface<R[]>
): useResourceListResponse<R> {
  const response = useResourceList(listUrl, getResourceUrl, config);
  const { mutate } = response;
  const callbackRef = useRef<(update: ResourceUpdate<R>) => Promise<R[]>>();

  const subscribeRequest: SubscribeRequest = {
    model: modelLabel,
    property: groupField,
    value: listId,
  };

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
    websocket.subscribe(subscribeRequest, callbackRef).then();
    // return () => {
    //   websocket.unsubscribe(sub);
    // };
  }, []);

  return response;
}

export default useRealtimeResourceList;
