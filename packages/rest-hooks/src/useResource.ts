import useSWR, { ConfigInterface } from "swr";
import { requestOptions, mutateResourceOptions, useResourceResponse } from "./types";
import { doApiRequest } from "./fetching";

// TODO: i don't want to add another generic type in here for errors.. where does it come from...?
function useResource<R>(
  url: string,
  config?: ConfigInterface<R>
): useResourceResponse<R> {

  // call SWR
  const { data, error, isValidating, mutate } = useSWR(url, {
    ...config,
  });

  // any type of request
  const request = async<R, E> (
    options: requestOptions,
    requestContent?: Partial<R>,
    // TODO: schema?
  ) => {
    // TODO: should we be using PATCH?
    const { method = "PATCH", sendRequest = true, revalidate = true } = options;

    if (requestContent && data) {
      mutate({ ...data, ...requestContent }, false);
    }
    if (sendRequest) {
      await doApiRequest(url, {
        method,
        body: requestContent,
      });
    }

    // TODO: make this more flexible... mabye make user provide some type info??
    if (revalidate) return mutate();
    else return new Promise<R>(() => {});
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

  return { data, error, isValidating, mutate: mutateWithAPI, request };
}

export default useResource;
