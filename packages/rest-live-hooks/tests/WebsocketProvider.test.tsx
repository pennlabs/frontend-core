import React, { useContext } from "react";
import { act, cleanup, render, waitForDomChange } from "@testing-library/react";
import WS from "jest-websocket-mock";
// @ts-ignore
import useRealtimeResource from "../src/useRealtimeResource";
// @ts-ignore
import { Action, ResourceUpdate } from "../src/types";
// @ts-ignore
import { WebsocketProvider, RLHContext } from "../src/Websocket";

let ws: WS;

const WS_HOST = "ws://localhost:3000";

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

describe("WebsocketProvider", () => {
  test("should indicate connection", async () => {
    const Page = () => {
      const { isConnected } = useContext(RLHContext);
      return (
        <div>
          {isConnected === true ? "yes" : isConnected === false ? "no" : ""}
        </div>
      );
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    expect(container.firstChild.textContent).toBe("yes");
  });

  test("should indicate disconnect", async () => {
    const Page = () => {
      const { isConnected } = useContext(RLHContext);
      return (
        <div>
          {isConnected === true ? "yes" : isConnected === false ? "no" : ""}
        </div>
      );
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    expect(container.firstChild.textContent).toBe("yes");
    ws.close();
    expect(container.firstChild.textContent).toBe("no");
  });

  test("should re-connect to websocket", async () => {
    const Page = () => {
      const { isConnected } = useContext(RLHContext);
      return (
        <div>
          {isConnected === true ? "yes" : isConnected === false ? "no" : ""}
        </div>
      );
    };
    const { container } = render(
      <WebsocketProvider url="/api/ws/subscribe/">
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    await act(async () => {
      ws.close();
    });
    expect(container.firstChild.textContent).toBe("no");
    await act(async () => {
      await ws.connected;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(container.firstChild.textContent).toBe("yes");
  });
});
