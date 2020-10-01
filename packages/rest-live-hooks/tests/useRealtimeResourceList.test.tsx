import React, { useContext } from "react";
import { act, cleanup, render, waitForDomChange } from "@testing-library/react";
import WS from "jest-websocket-mock";
// @ts-ignore
import useRealtimeResourceList from "../src/useRealtimeResourceList";
// @ts-ignore
import { Action, ResourceUpdate, SubscribeRequest } from "../src/types";
// @ts-ignore
import { WebsocketProvider, WSContext } from "../src/Websocket";

let ws: WS;

const WS_HOST = "ws://localhost:3000";
const MODEL = "todolist.Task";
interface Elem {
  id: number;
  message: string;
  list_id: number;
}
const fetcher = async (url: string): Promise<Elem[]> => [
  {
    list_id: 1,
    id: 1,
    message: "hello",
  },
  {
    list_id: 1,
    id: 2,
    message: "world",
  },
];

beforeEach(() => {
  ws = new WS(`${WS_HOST}/api/ws/subscribe/`);
});
afterEach(() => {
  cleanup();
  WS.clean();
});

jest.mock("../src/findOrigin", () => ({
  SITE_ORIGIN: () => WS_HOST,
}));

describe("useRealtimeResource", () => {
  test("should connect to websocket", async () => {
    const num = 1;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    expect(container.firstChild.textContent).toBe("message: ");
    await waitForDomChange({ container });
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        model: MODEL,
        property: "list_id",
        value: 1,
      } as SubscribeRequest<Elem>)
    );
    expect(container.firstChild.textContent).toBe("message: hello world");
  });

  test("should unsubscribe on unmount", async () => {
    const num = 1;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { unmount } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        model: MODEL,
        property: "list_id",
        value: 1,
      } as SubscribeRequest<Elem>)
    );
    unmount();
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        model: MODEL,
        property: "list_id",
        value: 1,
        unsubscribe: true,
      })
    );
  });

  test("should update from websocket", async () => {
    const num = 2;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected; // test will time out if connection fails.
    const update: ResourceUpdate<Elem> = {
      model: MODEL,
      action: Action.UPDATED,
      instance: {
        id: 1,
        list_id: 1,
        message: "sup",
      },
      group_key_value: 1,
    };
    act(() => {
      ws.send(JSON.stringify(update));
    });
    expect(container.firstChild.textContent).toBe("message: sup world");
  });

  test("should delete from websocket", async () => {
    const num = 3;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected; // test will time out if connection fails.
    const update: ResourceUpdate<Elem> = {
      model: MODEL,
      action: Action.DELETED,
      instance: {
        id: 2,
        list_id: 1,
        message: "world",
      },
      group_key_value: 1,
    };
    act(() => {
      ws.send(JSON.stringify(update));
    });
    expect(container.firstChild.textContent).toBe("message: hello");
  });

  test("should append new element from websocket", async () => {
    const num = 4;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher, orderBy: (a, b) => a.id - b.id }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected; // test will time out if connection fails.
    const update: ResourceUpdate<Elem> = {
      model: MODEL,
      action: Action.CREATED,
      instance: {
        id: 3,
        list_id: 1,
        message: "third",
      },
      group_key_value: 1,
    };
    act(() => {
      ws.send(JSON.stringify(update));
    });
    expect(container.firstChild.textContent).toBe("message: hello world third");
  });

  test("should check to make sure the group key is correct", async () => {
    const num = 5;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher, orderBy: (a, b) => a.id - b.id }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected; // test will time out if connection fails.
    const update: ResourceUpdate<Elem> = {
      model: MODEL,
      action: Action.CREATED,
      instance: {
        id: 3,
        list_id: 2,
        message: "BLAH",
      },
      group_key_value: 2,
    };
    act(() => {
      ws.send(JSON.stringify(update));
    });
    expect(container.firstChild.textContent).toBe("message: hello world");
  });

  test("should resend subscription and validate on reconnect", async () => {
    let s1 = "hello";
    let s2 = "world";

    const stateFetcher = async (url: string): Promise<Elem[]> => [
      {
        list_id: 1,
        id: 1,
        message: s1,
      },
      {
        list_id: 1,
        id: 2,
        message: s2,
      },
    ];
    const num = 1;
    const Page = () => {
      const { isConnected } = useContext(WSContext);
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL, property: "list_id", value: 1 },
        { fetcher: stateFetcher }
      );
      return (
        <div>
          <div>message: {data && data.map((e) => e.message).join(" ")}</div>
          <div>
            {isConnected === true ? "yes" : isConnected === false ? "no" : ""}
          </div>
        </div>
      );
    };
    const { container } = render(
      <WebsocketProvider
        url="/api/ws/subscribe/"
        options={{ maxReconnectionDelay: 50 }}
      >
        <Page />
      </WebsocketProvider>
    );
    expect(container.firstChild.firstChild.textContent).toBe("message: ");
    await waitForDomChange({ container });
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        model: MODEL,
        property: "list_id",
        value: 1,
      } as SubscribeRequest<Elem>)
    );
    expect(container.firstChild.firstChild.textContent).toBe(
      "message: hello world"
    );

    ws.server.clients().forEach((sock) => sock.close());
    s1 = "bye";
    s2 = "earth";

    await ws.closed;
    await ws.connected;
    await waitForDomChange({ container });

    await expect(ws).toReceiveMessage(
      JSON.stringify({
        model: MODEL,
        property: "list_id",
        value: 1,
      } as SubscribeRequest<Elem>)
    );
    expect(container.firstChild.firstChild.textContent).toBe(
      "message: bye earth"
    );
  });
});
