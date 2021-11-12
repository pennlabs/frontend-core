export type Identifier = string | number;

export interface Identifiable {
  id: Identifier;
}

export type MutateResponse<T, E> = 
| { success: true, data: T }
| { success: false, error: E }

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
