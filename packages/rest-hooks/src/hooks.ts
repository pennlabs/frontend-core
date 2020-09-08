import useSWR, { ConfigInterface } from "swr";
import {
  Identifiable,
  Identifier,
  mutateResourceListOptions,
  mutateResourceOptions,
  useResourceListResponse,
  useResourceResponse,
} from "./types";
import { doApiRequest, patchInList } from "./utils";

export function useResource<R>(
  url: string,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const { data, error, isValidating, mutate } = useSWR(url, {
    ...config,
  });
  const mutateWithAPI = async (
    patchedResource?: Partial<R>,
    options: mutateResourceOptions = {}
  ) => {
    const { method = "PATCH", sendRequest = true, revalidate = true } = options;

    if (patchedResource && data) {
      mutate({ ...data, ...patchedResource }, false);
    }
    if (sendRequest) {
      await doApiRequest(url, {
        method,
        body: patchedResource,
      });
    }

    if (revalidate) return mutate();
    else return new Promise<R>(() => {});
  };
  return { data, error, isValidating, mutate: mutateWithAPI };
}

export function useResourceList<R extends Identifiable>(
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  config?: ConfigInterface<R[]>
): useResourceListResponse<R> {
  const { data, error, isValidating, mutate } = useSWR(listUrl, config);
  const mutateWithAPI = async (
    id?: Identifier,
    patchedResource?: Partial<R> | null,
    options: mutateResourceListOptions<R> = {}
  ) => {
    const {
      method = "PATCH",
      sendRequest = true,
      revalidate = true,
      append = false,
      sortBy = (a, b) => 0,
    } = options;
    console.log("MUTATION");
    console.log(`id: ${id}, data: ${data}`);

    let didPatch: boolean = false;
    // if ID is undefined/null, don't patch.
    if (append && data) {
      const newList = [patchedResource as R, ...data].sort(sortBy);
      mutate(newList, false);
    } else if (id && data) {
      let patchedList: R[];
      [patchedList, didPatch] = patchInList(data, id, patchedResource);
      console.log(patchedList);
      console.log(didPatch);
      if (didPatch) {
        mutate(patchedList, false);
      }
    }
    // Only perform an API request when the patch finds a matching entry.
    if (!append && sendRequest && didPatch) {
      await doApiRequest(getResourceUrl(id), {
        method,
        body: patchedResource,
      });
    }
    if (revalidate) return mutate();
    else return new Promise<R[]>(() => {});
  };
  return { data, error, isValidating, mutate: mutateWithAPI };
}
