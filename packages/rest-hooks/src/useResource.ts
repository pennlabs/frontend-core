import useSWR, { ConfigInterface } from "swr";
import { requestOptions, mutateResourceOptions, useResourceResponse } from "./types";
import { doApiRequest } from "./fetching";

function useResource<R>(
  url: string,
  config?: ConfigInterface<R>
): useResourceResponse<R> {

  // call SWR
  const { data, error, isValidating, mutate } = useSWR(url, {
    ...config,
  });

  // any type of request
  const request = async (
    options: requestOptions
  ) => {
    // TODO
  }

  // generic mutate function
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
