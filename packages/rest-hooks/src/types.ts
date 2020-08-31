export type Identifier = string | number;

export interface Identifiable {
  id: Identifier;
}

export type mutateResourceFunction<T extends Identifiable> = (
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
