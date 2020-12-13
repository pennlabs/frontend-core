import { Identifiable, Identifier } from "@pennlabs/rest-hooks";
import { MutableRefObject } from "react";

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
  group_by?: K;
  value: Identifier;
};

export type ResourceUpdate<R extends Identifiable> = {
  type: "broadcast";
  request_id: number;
  model: string;
  action: Action;
  instance: R;
};

export type RevalidationUpdate = {
  action: "REVALIDATE";
};
export type UpdateListener = {
  request_id: number;
  request: SubscribeRequest<any>;
  notify: MutableRefObject<
    (update: ResourceUpdate<any> | RevalidationUpdate) => Promise<any[] | any>
  >;
};
