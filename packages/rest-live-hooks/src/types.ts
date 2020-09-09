import { Identifiable } from "@pennlabs/rest-hooks";

export enum Action {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
}
export type SubscribeRequest<
  R extends Identifiable,
  K extends keyof R = keyof R
> = {
  model: string;
  property?: K;
  value: string | number;
};

export type ResourceUpdate<R extends Identifiable> = {
  action: Action;
  model: string;
  instance: R;
};
