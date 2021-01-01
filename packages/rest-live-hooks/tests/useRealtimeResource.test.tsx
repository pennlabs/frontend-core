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
import useRealtimeResource from "../src/useRealtimeResource";
// @ts-ignore
import { Action, ResourceBroadcast } from "../src/types";
// @ts-ignore
import { WebsocketProvider, WSContext } from "../src/Websocket";

let ws: WS;

const REQUEST_ID = 1337;
const WS_HOST = "ws://localhost:3000";
const MODEL = "todolist.Task";
interface Elem {
  id: number;
  message: string;
}
const fetcher = async (url: string): Promise<Elem> => ({
  id: 1,
  message: "hi",
});

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

describe("useRealtimeResource", () => {
  test("should connect to websocket", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/1/",
        { model: MODEL, lookup_by: 1 },
        { fetcher }
      );
      return <div>message: {data && data.message}</div>;
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
        action: "retrieve",
        view_kwargs: {},
        query_params: {},
        model: MODEL,
        lookup_by: 1,
      })
    );
    expect(container.firstChild.textContent).toBe("message: hi");
  });

  test("should unsubscribe on hook unmount", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/1/",
        {
          model: MODEL,
          lookup_by: 1,
        },
        { fetcher }
      );
      return <div>message: {data && data.message}</div>;
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

    const { container, unmount, getByText } = render(<ProviderComponent />);
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "subscribe",
        id: REQUEST_ID,
        action: "retrieve",
        view_kwargs: {},
        query_params: {},
        model: MODEL,
        lookup_by: 1,
      })
    );

    fireEvent.click(getByText("Click"));

    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "unsubscribe",
        id: REQUEST_ID,
      })
    );
  });

  test("should disconnect on provider unmount", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/1/",
        {
          model: MODEL,
          lookup_by: 1,
        },
        { fetcher }
      );
      return <div>message: {data && data.message}</div>;
    };

    const { container, unmount } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "subscribe",
        id: REQUEST_ID,
        action: "retrieve",
        view_kwargs: {},
        query_params: {},
        model: MODEL,
        lookup_by: 1,
      })
    );
    unmount();

    await ws.closed;
  });

  test("should update with message", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/2/",
        { model: MODEL, lookup_by: 1 },
        { fetcher }
      );
      return <div>message: {data && data.message}</div>;
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected; // test will time out if connection fails.
    const update: ResourceBroadcast<Elem> = {
      type: "broadcast",
      id: REQUEST_ID,
      model: MODEL,
      action: Action.UPDATED,
      instance: {
        id: 1,
        message: "hello",
      },
    };
    act(() => {
      ws.send(JSON.stringify(update));
    });
    expect(container.firstChild.textContent).toBe("message: hello");
  });

  test("should resend subscription and revalidate on reconnect", async () => {
    let state = 0;
    const stateFetcher = async () => ({
      id: 1,
      message: `hi${state}`,
    });

    const Page = () => {
      const { isConnected } = useContext(WSContext);
      const { data } = useRealtimeResource(
        "/items/1/",
        { model: MODEL, lookup_by: 1 },
        { fetcher: stateFetcher }
      );
      return (
        <div>
          <div>message: {data && data.message}</div>
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
        action: "retrieve",
        view_kwargs: {},
        query_params: {},
        model: MODEL,
        lookup_by: 1,
      })
    );
    expect(container.firstChild.firstChild.textContent).toBe("message: hi0");

    ws.server.clients().forEach((sock) => sock.close());
    state = 1;
    await ws.closed;
    await ws.connected;
    await waitForDomChange({ container });

    await expect(ws).toReceiveMessage(
      JSON.stringify({
        type: "subscribe",
        id: REQUEST_ID,
        action: "retrieve",
        view_kwargs: {},
        query_params: {},
        model: MODEL,
        lookup_by: 1,
      })
    );
    expect(container.firstChild.firstChild.textContent).toBe("message: hi1");
  });
});
