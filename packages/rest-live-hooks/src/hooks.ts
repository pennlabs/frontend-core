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

export function useRealtimeResource<R extends Identifiable>(
  modelLabel: string,
  resourceId: Identifier,
  url: string,
  initialData?: R,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const response = useResource(url, initialData, config);
  const { mutate } = response;

  // TODO: Subscribe to updates for this resource (will need ID+model name)
  const subscribeRequest: SubscribeRequest = {
    model: modelLabel,
    value: resourceId,
  };

  // TODO: Mutate (with no revalidation) when updates come through
  const updateCallback = async (update: ResourceUpdate<R>) => {
    switch (update.action) {
      case Action.CREATED:
        // This case shouldn't be hit: you should never subscribe to updates
        // on an instance that hasn't yet been created
        break;
      case Action.UPDATED:
        return mutate(update.instance, null, false);
      // How do we want to handle deletion of a single object?
      case Action.DELETED:
        return mutate(null, null, false);
    }
  };

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

  // TODO: Subscribe to updates for this resource (will need ID+model name)
  const subscribeRequest: SubscribeRequest = {
    model: modelLabel,
    property: groupField,
    value: listId,
  };
  // TODO: Send subscription

  // TODO: Mutate (with no revalidation) when updates come through
  const updateCallback = async (update: ResourceUpdate<R>) => {
    switch (update.action) {
      case Action.CREATED:
        return mutate(
          update.instance.id,
          update.instance,
          null,
          false,
          true,
          orderBy
        );
      case Action.UPDATED:
        return mutate(update.instance.id, update.instance, null, false);
      case Action.DELETED:
        return mutate(update.instance.id, null, null, false);
    }
  };

  return response;
}
