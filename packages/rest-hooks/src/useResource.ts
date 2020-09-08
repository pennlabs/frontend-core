import useSWR, { ConfigInterface } from "swr";
import { mutateResourceOptions, useResourceResponse } from "./types";
import { doApiRequest } from "./fetching";

function useResource<R>(
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

export default useResource;
