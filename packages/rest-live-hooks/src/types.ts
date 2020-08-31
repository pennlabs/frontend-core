import { Identifiable } from "@pennlabs/rest-hooks";

export enum Action {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
}
export type SubscribeRequest = {
  model: string;
  property?: string;
  value: string;
};

export type ResourceUpdate<R extends Identifiable> = {
  action: Action;
  model: string;
  instance: R;
};
