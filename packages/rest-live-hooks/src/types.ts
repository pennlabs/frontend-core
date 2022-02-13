import { Identifiable, Identifier } from "@pennlabs/rest-hooks";
import { MutableRefObject } from "react";

export enum Action {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
}

export interface SubscribeRequest {
  model: string;
  action?: "retrieve" | "list";
  view_kwargs?: { [key: string]: any };
  query_params?: { [key: string]: any };
}

export interface RealtimeRetrieveRequestProps<
  R extends Identifiable,
  K extends keyof R = keyof R
> extends SubscribeRequest {
  action?: "retrieve";
  lookup_by: Identifier;
}

export interface RealtimeListRequestProps extends SubscribeRequest {
  action?: "list";
}

export type ResourceBroadcast<R extends Identifiable> = {
  type: "broadcast";
  id: number;
  model: string;
  action: Action;
  instance: R;
};

export type RevalidationUpdate = {
  action: "REVALIDATE";
};
export type UpdateListener = {
  request_id: number;
  request: SubscribeRequest;
  notify: MutableRefObject<
    (
      update: ResourceBroadcast<any> | RevalidationUpdate
    ) => Promise<any[] | any>
  >;
};
