export type Identifier = string | number;

export interface Identifiable {
  id: Identifier;
}

export type Response<T, E> = 
| { success: true, data: T }
| { success: false, err: E }

export type requestOptions = {
  method: string;
  revalidate?: boolean;
}

export type mutateResourceOptions = {
  method?: string;
  sendRequest?: boolean;
  revalidate?: boolean;
};

export type mutateResourceFunction<T> = (
  patchedResource?: Partial<T>,
  options?: mutateResourceOptions
) => Promise<T | undefined>;

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

export type useResourceResponse<T> = {
  data: T | undefined;
  error: any;
  isValidating: boolean;
  mutate: mutateResourceFunction<T>;
};

export type useResourceListResponse<T extends Identifiable> = {
  data: T[] | undefined;
  error: any;
  isValidating: boolean;
  mutate: mutateResourceListFunction<T>;
};
