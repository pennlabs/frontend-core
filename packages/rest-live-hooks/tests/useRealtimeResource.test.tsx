import React from "react";
import { act, cleanup, render, waitForDomChange } from "@testing-library/react";
import WS from "jest-websocket-mock";
// @ts-ignore
import useRealtimeResource from "../src/useRealtimeResource";
// @ts-ignore
import { Action, ResourceUpdate } from "../src/types";
// @ts-ignore
import { websocket } from "../src/websocket";

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
  websocket.reset();
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
    const { container } = render(<Page />);
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
    const { container, unmount } = render(<Page />);
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
    const { container } = render(<Page />);
    await ws.connected; // test will time out if connection fails.
    const update: ResourceUpdate<Elem> = {
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
});
