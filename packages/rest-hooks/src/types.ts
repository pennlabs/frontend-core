export type Identifier = string | number;

export interface Identifiable {
  id: Identifier;
}

export type mutateResourceFunction<T> = (
  patchedResource?: Partial<T>,
  method?: string | null,
  revalidate?: boolean
) => Promise<T | undefined>;

export type mutateResourceListFunction<T extends Identifiable> = (
  id: number,
  data: Partial<T> | null,
  method?: string | null,
  revalidate?: boolean
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
