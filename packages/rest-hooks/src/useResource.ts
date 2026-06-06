import useSWR, { ConfigInterface } from "swr";
import { mutateFunction, mutateOptions, useResourceResponse } from "./types";
import { doApiRequest } from "./fetching";

function useResource<T, E>(
  url: string,
  config?: ConfigInterface<T>
): useResourceResponse<T, E> {
  // call SWR
  const { data, error, isValidating, mutate } = useSWR(url, {
    ...config,
  });

  // for patch requests
  const mutateWithAPI: mutateFunction<T, E> = async (
    newData?: Partial<T>,
    options: mutateOptions = {}
  ) => {
    const {
      sendRequest = true,
      optimistic = true,
      revalidate = true,
    } = options;

    // local stuff we'll send back if not reverifying
    let updatedLocalData = data;

    // mutate data locally (don't revalidate yet)
    if (optimistic && newData && data) {
      updatedLocalData = { ...data, ...newData };
      mutate(updatedLocalData, false);
    }

    try {
      if (sendRequest) {
        await doApiRequest(url, {
          method: "PATCH",
          body: newData,
        });
      }

      if (revalidate) return { success: true, data: await mutate() };

      return { success: true, data: updatedLocalData };
    } catch (e) {
      return { success: false, error: e as E };
    }
  };

  return { data, error, isValidating, mutate: mutateWithAPI };
}

export default useResource;
