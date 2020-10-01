import React, { useContext } from "react";
import { act, cleanup, render, waitForDomChange } from "@testing-library/react";
import WS from "jest-websocket-mock";
// @ts-ignore
import useRealtimeResource from "../src/useRealtimeResource";
// @ts-ignore
import { Action, ResourceUpdate } from "../src/types";
// @ts-ignore
import { WebsocketProvider, WSContext } from "../src/Websocket";

let ws: WS;

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
  WS.clean();
});

jest.mock("../src/findOrigin", () => ({
  SITE_ORIGIN: () => WS_HOST,
}));

describe("useRealtimeResource", () => {
  test("should connect to websocket", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/1/",
        { model: MODEL, value: 1 },
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
        model: MODEL,
        value: 1,
      })
    );
    expect(container.firstChild.textContent).toBe("message: hi");
  });

  test("should unsubscribe on unmount", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/1/",
        {
          model: MODEL,
          value: 1,
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
        model: MODEL,
        value: 1,
      })
    );
    unmount();
    await expect(ws).toReceiveMessage(
      JSON.stringify({
        model: MODEL,
        value: 1,
        unsubscribe: true,
      })
    );
  });

  test("should update with message", async () => {
    const Page = () => {
      const { data } = useRealtimeResource(
        "/items/2/",
        { model: MODEL, value: 1 },
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
    const update: ResourceUpdate<Elem> = {
      model: MODEL,
      action: Action.UPDATED,
      instance: {
        id: 1,
        message: "hello",
      },
      group_key_value: 1,
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
        { model: MODEL, value: 1 },
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
        model: MODEL,
        value: 1,
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
        model: MODEL,
        value: 1,
      })
    );
    expect(container.firstChild.firstChild.textContent).toBe("message: hi1");
  });
});
