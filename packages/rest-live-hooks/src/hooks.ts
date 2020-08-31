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
  url: string,
  initialData?: R,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const response = useResource(url, initialData, config);
  const { mutate } = response;

  // TODO: Subscribe to updates for this resource (will need ID+model name)

  // TODO: Mutate (with no revalidation) when updates come through

  return response;
}

export function useRealtimeResourceList<R extends Identifiable>(
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

  // TODO: Mutate (with no revalidation) when updates come through

  return response;
}
