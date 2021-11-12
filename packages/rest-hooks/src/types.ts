export type Identifier = string | number;

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

export type mutateResourceListOptions<T> = {
  method?: string;
  sendRequest?: boolean;
  revalidate?: boolean;
  append?: boolean;
  sortBy?: (a: T, b: T) => number;
};

export type mutateResourceListFunction<T extends Identifiable> = (
  id?: Identifier,
  data?: Partial<T> | null,
  options?: mutateResourceListOptions<T>
) => Promise<T[] | undefined>;

export type useResourceResponse<T, E> = {
  data?: T;
  error?: E;
  isValidating: boolean;
  mutate: mutateFunction<T, E>;
};

export type useResourceListResponse<T extends Identifiable> = {
  data: T[] | undefined;
  error: any;
  isValidating: boolean;
  mutate: mutateResourceListFunction<T>;
};
