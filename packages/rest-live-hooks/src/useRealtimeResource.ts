import {
  Identifiable,
  Identifier,
  useResource,
  useResourceResponse,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { useEffect, useRef } from "react";
import { Action, ResourceUpdate, SubscribeRequest } from "./types";
import { takeTicket, websocket } from "./websocket";

function useRealtimeResource<R extends Identifiable>(
  modelLabel: string,
  resourceId: Identifier,
  url: string,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const response = useResource(url, config);
  const { mutate } = response;
  const callbackRef = useRef<(update: ResourceUpdate<R>) => Promise<R>>();

  const subscribeRequest: SubscribeRequest<R> = {
    model: modelLabel,
    value: resourceId,
  };

  callbackRef.current = async (update: ResourceUpdate<R>) => {
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
    const uuid = takeTicket();
    websocket.subscribe(subscribeRequest, callbackRef, uuid).then();
    return () => websocket.unsubscribe(uuid);
  }, []);

  return response;
}

export default useRealtimeResource;
