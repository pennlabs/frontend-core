import React, { useContext } from "react";
import { act, cleanup, render, waitForDomChange } from "@testing-library/react";
import WS from "jest-websocket-mock";
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
    await ws.closed;
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
      <WebsocketProvider
        url="/api/ws/subscribe/"
        options={{ maxReconnectionDelay: 50, debug: true }}
      >
        <Page />
      </WebsocketProvider>
    );
    await ws.connected;
    await expect(container.firstChild.textContent).toBe("yes");
    ws.server.clients().forEach((sock) => sock.close());
    await ws.closed;
    expect(container.firstChild.textContent).toBe("no");
    await ws.connected;
    await waitForDomChange({ container });
    await expect(container.firstChild.textContent).toBe("yes");
  });
});
