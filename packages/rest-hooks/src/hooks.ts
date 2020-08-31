import useSWR, { ConfigInterface } from "swr";
import {
  Identifiable,
  Identifier,
  mutateResourceFunction,
  mutateResourceListFunction,
} from "./types";
import { doApiRequest } from "./utils";

export function useResource<R extends Identifiable>(
  url: string,
  initialData?: R,
  config?: ConfigInterface<R>
): [R | undefined, any, boolean, mutateResourceFunction<R>] {
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
  return [data, error, isValidating, mutateWithAPI];
}

/**
 * Patch in an updated element in a list.
 * @param list list of elements, where elements have an `id` property.
 * @param id identifier to update
 * @param patch updated properties. If null, delete from list.
 */
function patchInList<T extends Identifiable>(
  list: T[],
  id: number,
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
): [R[] | undefined, any, boolean, mutateResourceListFunction<R>] {
  const { data, error, isValidating, mutate } = useSWR(listUrl, {
    initialData,
    ...config,
  });
  const mutateWithAPI = async (
    id?: number,
    patchedResource?: Partial<R> | null,
    method: string | null = "PATCH",
    revalidate: boolean = true
  ) => {
    // if ID is undefined/null, don't patch.
    let didPatch: boolean = false;
    if (id && data) {
      const [patchedList, didPatchInner] = patchInList(
        data,
        id,
        patchedResource
      );
      didPatch = didPatchInner;
      if (didPatch) {
        mutate(patchedList, false);
      }
    }
    // Only perform an API request when the patch finds a matching entry.
    if (id && didPatch && method) {
      await doApiRequest(getResourceUrl(id), {
        method,
        body: patchedResource,
      });
    }
    // Always revalidate, even if mutate was a no-op.
    if (revalidate) return mutate();
    else return new Promise<R[]>(() => {});
  };
  return [data, error, isValidating, mutateWithAPI];
}
