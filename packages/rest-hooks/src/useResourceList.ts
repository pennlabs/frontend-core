import {
  Identifiable,
  Identifier,
  mutateResourceListOptions,
  useResourceListResponse,
} from "./types";
import { useContext } from "react";
import useSWR, { ConfigInterface } from "swr";
import { patchInList } from "./utils";
import { doApiRequest } from "./fetching";
import { GlobalConfigContext, getBestFetcher } from "./globalConfig";

function useResourceList<R extends Identifiable>(
  listUrl: string | (() => string),
  getResourceUrl: (id?: Identifier) => string,
  config?: ConfigInterface<R[]>
): useResourceListResponse<R> {
  const globalConfig = useContext(GlobalConfigContext);

  const fetcher = getBestFetcher(config, globalConfig);

  const { data, error, isValidating, mutate } = useSWR(listUrl, {
    ...config,
    fetcher,
  });
  const mutateWithAPI = async (
    id?: Identifier,
    patchedResource?: Partial<R>,
    options: mutateResourceListOptions<R> = {}
  ) => {
    const {
      method = "PATCH",
      sendRequest = true,
      revalidate = true,
      append = false,
      sortBy = (a, b) => 0,
    } = options;
    let didPatch: boolean = false;
    // if ID is undefined/null, don't patch.
    if (id && data) {
      let patchedList: R[];
      [patchedList, didPatch] = patchInList(data, id, patchedResource);
      if (didPatch) {
        mutate(patchedList.sort(sortBy), false);
      } else if (append) {
        const newList = [patchedResource as R, ...data];
        mutate(newList.sort(sortBy), false);
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

export default useResourceList;
