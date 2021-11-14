import {
  Identifiable,
  Identifier,
  mutateListOptions,
  mutateListFunction,
  useResourceListResponse,
} from "./types";
import useSWR, { ConfigInterface } from "swr";
import { patchInList } from "./utils";
import { doApiRequest } from "./fetching";

function useResourceList<T extends Identifiable, E>(
  listUrl: string | (() => string),
  getResourceUrl: (id: Identifier) => string,
  config?: ConfigInterface<T[]>
): useResourceListResponse<T, E> {
  const { data, error, isValidating, mutate } = useSWR(listUrl, config);

  // mutate function (for patch + post requests)
  const mutateWithAPI: mutateListFunction<T, E> = async (
    options: mutateListOptions<T>,
    requestContent?: Partial<T>,
  ) => {

    const {
      method,
      sendRequest = true,
      optimistic = true,
      revalidate = true,
      sortBy = (a, b) => 0,
    } = options;

    // will be true if match found in list
    let didPatch: boolean = false;
    let localList = data;

    // if ID is undefined/null, don't patch. this is just local mutation.
    if (data && optimistic) {
      if (method === "POST") {
        localList = [requestContent as T, ...data].sort(sortBy);
      } else if (method === "DELETE") {
        let patchedList: T[];
        [patchedList, didPatch = false] = patchInList(data, options.id, null);
      } else {
        let patchedList: T[];
        [patchedList, didPatch = false] = patchInList(data, options.id, requestContent);
        if (didPatch) {
          localList = patchedList.sort(sortBy);
        }
      }

      // mutate our local data
      mutate(localList, false);
    }

    try {
      // Only perform an API request when the patch finds a matching entry.
      // need to update this so POST requests use original resource path
      if (sendRequest && didPatch) {
        const apiPath = (method === "POST")
          // TODO: make sure this actually works
          ? (listUrl instanceof Function ? listUrl() : listUrl)
          : getResourceUrl(id);
        await doApiRequest(apiPath, {
          method,
          body: requestContent,
        });
      }

      if (revalidate) return {success: true, data: await mutate()};

      else return {success: true, data: localList}
    } catch (e) {
      // on some error, return our non-success pattern
      return {success: false, error: e as E}
    }
  };


  return { data, error, isValidating, mutate: mutateWithAPI };
}

export default useResourceList;
