import React, { useContext, useState } from "react";
import {
  act,
  cleanup,
  render,
  waitForDomChange,
  fireEvent,
} from "@testing-library/react";
import WS from "jest-websocket-mock";
import { cache } from "swr";
// @ts-ignore
import useRealtimeResourceList from "../src/useRealtimeResourceList";
// @ts-ignore
import { Action, ResourceBroadcast, SubscribeRequest } from "../src/types";
// @ts-ignore
import { WebsocketProvider, WSContext } from "../src/Websocket";

let ws: WS;

const REQUEST_ID = 1337;
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
  cache.clear();
  WS.clean();
});

jest.mock("../src/findOrigin", () => ({
  SITE_ORIGIN: () => WS_HOST,
}));

jest.mock("../src/takeTicket", () => ({
  takeTicket: () => REQUEST_ID,
}));

describe("useRealtimeResourceList", () => {
  test("should connect to websocket", async () => {
    const num = 1;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL },
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
        type: "subscribe",
        id: REQUEST_ID,
        action: "list",
        model: MODEL,
      } as SubscribeRequest)
    );
    expect(container.firstChild.textContent).toBe("message: hello world");
  });

  test("should unsubscribe on hook unmount", async () => {
    const num = 1;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL },
        { fetcher }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };

    const ProviderComponent = () => {
      const [mount, setMount] = useState(true);
      return (
        <WebsocketProvider url="/api/ws/subscribe/">
          <button onClick={() => setMount(false)}>Click</button>
          {mount && <Page />}
        </WebsocketProvider>
      );
    };

    const { unmount, getByText } = render(<ProviderComponent />);
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "subscribe",
        id: REQUEST_ID,
        action: "list",
        model: MODEL,
      } as SubscribeRequest)
    );

    fireEvent.click(getByText("Click"));

    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "unsubscribe",
        id: REQUEST_ID,
      })
    );
  });

  test("should unsubscribe on provider unmount", async () => {
    const num = 1;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL },
        { fetcher }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };

    const { unmount, getByText } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "subscribe",
        id: REQUEST_ID,
        action: "list",
        model: MODEL,
      } as SubscribeRequest)
    );

    unmount();
    await ws.closed;
  });

  test("should update from websocket", async () => {
    const num = 2;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL },
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
    const update: ResourceBroadcast<Elem> = {
      id: REQUEST_ID,
      type: "broadcast",
      model: MODEL,
      action: Action.UPDATED,
      instance: {
        id: 1,
        list_id: 1,
        message: "sup",
      },
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
        { model: MODEL },
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
    const update: ResourceBroadcast<Elem> = {
      id: REQUEST_ID,
      type: "broadcast",
      model: MODEL,
      action: Action.DELETED,
      instance: {
        id: 2,
        list_id: 1,
        message: "world",
      },
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
        { model: MODEL },
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
    const update: ResourceBroadcast<Elem> = {
      id: REQUEST_ID,
      type: "broadcast",
      model: MODEL,
      action: Action.CREATED,
      instance: {
        id: 3,
        list_id: 1,
        message: "third",
      },
    };
    act(() => {
      ws.send(JSON.stringify(update));
    });
    expect(container.firstChild.textContent).toBe("message: hello world third");
  });

  test("should check to make sure the id is correct", async () => {
    const num = 5;
    const Page = () => {
      const { data } = useRealtimeResourceList(
        `/items-${num}/`,
        (id) => `/items-${num}/${id}/`,
        { model: MODEL },
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
    const update: ResourceBroadcast<Elem> = {
      id: REQUEST_ID + 21,
      type: "broadcast",
      model: MODEL,
      action: Action.CREATED,
      instance: {
        id: 3,
        list_id: 2,
        message: "BLAH",
      },
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
        { model: MODEL },
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
        type: "subscribe",
        id: REQUEST_ID,
        action: "list",
        model: MODEL,
      } as SubscribeRequest)
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
        type: "subscribe",
        id: REQUEST_ID,
        action: "list",
        model: MODEL,
      } as SubscribeRequest)
    );
    expect(container.firstChild.firstChild.textContent).toBe(
      "message: bye earth"
    );
  });
});
