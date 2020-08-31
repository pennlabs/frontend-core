import {
  useResource,
  useResourceList,
  useResourceListResponse,
  useResourceResponse,
  Identifiable,
} from "@pennlabs/rest-hooks";
import { ConfigInterface } from "swr";
import { Identifier } from "@pennlabs/rest-hooks/dist/types";

export function useRealtimeResource<R extends Identifiable>(
  modelLabel: string,
  resourceId: string | number,
  url: string,
  initialData?: R,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const response = useResource(url, initialData, config);
  const { mutate } = response;

  // TODO: Subscribe to updates for this resource (will need ID+model name)
  const subscribeRequest = {
    model: modelLabel,
    pk: resourceId,
  };

  // TODO: Mutate (with no revalidation) when updates come through

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
  const subscribeRequest = {
    model: modelLabel,
    property: groupField,
    value: listId,
  };

  // TODO: Mutate (with no revalidation) when updates come through

  return response;
}
