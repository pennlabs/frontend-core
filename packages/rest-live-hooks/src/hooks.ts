import { ConfigInterface } from "swr";
import {
  Identifiable,
  Identifier,
  useResource,
  useResourceList,
  useResourceListResponse,
  useResourceResponse,
} from "@pennlabs/rest-hooks";
import { Action, ResourceUpdate, SubscribeRequest } from "./types";
import { websocket } from "./websocket";
import { useEffect } from "react";

export function useRealtimeResource<R extends Identifiable>(
  modelLabel: string,
  resourceId: Identifier,
  url: string,
  initialData?: R,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const response = useResource(url, initialData, config);
  const { mutate } = response;

  const subscribeRequest: SubscribeRequest = {
    model: modelLabel,
    value: resourceId,
  };

  const updateCallback = async (update: ResourceUpdate<R>) => {
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
        return mutate(null, mutateOptions);
    }
  };
  useEffect(() => {
    const sub = websocket.subscribe(subscribeRequest, updateCallback);
    return () => {
      websocket.unsubscribe(sub);
    };
  }, []);

  return response;
}

export function useRealtimeResourceList<R extends Identifiable>(
  modelLabel: string,
  listId: string | number,
  groupField: string,
  orderBy: (a: R, b: R) => number,
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  initialData?: R[],
  config?: ConfigInterface<R[]>
): useResourceListResponse<R> {
  const response = useResourceList(
    listUrl,
    getResourceUrl,
    initialData,
    config
  );
  const { mutate } = response;

  const subscribeRequest: SubscribeRequest = {
    model: modelLabel,
    property: groupField,
    value: listId,
  };

  const updateCallback = async (update: ResourceUpdate<R>) => {
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
    const sub = websocket.subscribe(subscribeRequest, updateCallback);
    return () => {
      websocket.unsubscribe(sub);
    };
  }, []);

  return response;
}
