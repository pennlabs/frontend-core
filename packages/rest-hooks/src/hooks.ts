import useSWR, { ConfigInterface } from "swr";
import {
  Identifiable,
  Identifier,
  useResourceListResponse,
  useResourceResponse,
} from "./types";
import { doApiRequest } from "./utils";

export function useResource<R>(
  url: string,
  initialData?: R,
  config?: ConfigInterface<R>
): useResourceResponse<R> {
  const { data, error, isValidating, mutate } = useSWR(url, {
    initialData,
    ...config,
  });
  const mutateWithAPI = async (
    patchedResource?: Partial<R>,
    method: string | null = "PATCH",
    revalidate: boolean = true
  ) => {
    if (patchedResource && data) {
      mutate({ ...data, ...patchedResource }, false);
    }
    if (method !== null) {
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

/**
 * Patch in an updated element in a list.
 * @param list list of elements, where elements have an `id` property.
 * @param id identifier to update
 * @param patch updated properties. If null, delete from list.
 */
function patchInList<T extends Identifiable>(
  list: T[],
  id: Identifier,
  patch: Partial<T> | null
): [T[], boolean] {
  for (let i = 0; i < list.length; i += 1) {
    const obj = list[i];
    // If the ID of this element matches the desired ID
    if (obj.id === id) {
      if (patch === null) {
        return [[...list.slice(0, i), ...list.slice(i + 1)], true];
      }
      const newObj = { ...obj, ...patch };
      return [[...list.slice(0, i), newObj, ...list.slice(i + 1)], true];
    }
  }
  // if no match exists, return the original list.
  return [list, false];
}

export function useResourceList<R extends Identifiable>(
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  initialData?: R[],
  config?: ConfigInterface<R[]>
): useResourceListResponse<R> {
  const { data, error, isValidating, mutate } = useSWR(listUrl, {
    initialData,
    ...config,
  });
  const mutateWithAPI = async (
    id?: Identifier,
    patchedResource?: Partial<R> | null,
    method: string | null = "PATCH",
    revalidate: boolean = true,
    append: boolean = false,
    sortBy: (a: R, b: R) => number = (a, b) => 0
  ) => {
    let didPatch: boolean = false;
    // if ID is undefined/null, don't patch.
    if (append && data) {
      const newList = [patchedResource as R, ...data].sort(sortBy);
      mutate(newList, false);
    } else if (id && data) {
      let patchedList: R[];
      [patchedList, didPatch] = patchInList(data, id, patchedResource);
      if (didPatch) {
        mutate(patchedList, false);
      }
    }
    // Only perform an API request when the patch finds a matching entry.
    if (!append && id && didPatch && method) {
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
