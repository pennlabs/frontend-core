export type Identifier = string | number;

export type ListMutateMethod = 
| "PATCH" | "POST" | "DELETE"

export interface Identifiable {
  id: Identifier;
}

export type MutateResponse<T, E> = 
| { success: true, data: T }
| { success: false, error: E }

/**
 * Options for a useResource mutate function
 * 
 * @property {boolean=true} sendRequest  - Whether or not to send the request
 * @property {boolean=true} optimistic   - Enables locally changing the data before revalidating
 * @property {boolean=true} revalidate   - Should we revalidate our data after updating?
 */
export type mutateOptions = {
  sendRequest?: boolean;
  optimistic?: boolean;
  revalidate?: boolean;
}

export type mutateFunction<T, E> = (
  options: mutateOptions,
  requestContent?: Partial<T>,
) => Promise<MutateResponse<T, E>>;

interface mutateListOptionsBase<T> {
  sendRequest?: boolean;
  optimistic?: boolean;
  revalidate?: boolean;
  sortBy?: (a: T, b: T) => number;
}

interface mutateListOptionsBaseUrl {
  method: "POST";
}

interface mutateListOptionsIdUrl {
  method: "PATCH" | "DELETE";
  id: Identifier;
}

/**
 * Options for a useResourceList mutate function
 * 
 * @property {boolean=true} sendRequest    - Whether or not to send an API request
 * @property {boolean=true} optimistic     - Should we update local data before reverifying?
 * @property {boolean=true} revalidate     - Revalidate after (possibly) updating local data
 * @property {{@link ListMutateMethod}}    - Request method
 * @property {{@link Identifier}} id       - ID of the data to PATCH or DELETE
 */
export type mutateListOptions<T> =
  mutateListOptionsBase<T> & (mutateListOptionsBaseUrl | mutateListOptionsIdUrl);

export type mutateListFunction<T extends Identifiable, E> = (
  options: mutateListOptions<T>,
  requestContent?: Partial<T> | null,
) => Promise<MutateResponse<T[], E>>;


// responses

export type useResourceResponse<T, E> = {
  data?: T;
  error?: E;
  isValidating: boolean;
  mutate: mutateFunction<T, E>;
};

export type useResourceListResponse<T extends Identifiable, E> = {
  data: T[] | undefined;
  error: any;
  isValidating: boolean;
  mutate: mutateListFunction<T, E>;
};
