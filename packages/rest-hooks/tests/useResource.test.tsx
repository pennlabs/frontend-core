import {
  act,
  cleanup,
  fireEvent,
  render,
  waitForDomChange,
} from "@testing-library/react";
import React from "react";
// @ts-ignore
import useResource from "../src/useResource";
// @ts-ignore
import * as fetching from "../src/fetching";

const fetcher = async (url: string) => ({ id: 1, message: "hi" });

jest.mock("../src/fetching", () => ({
  doApiRequest: jest.fn(),
}));

describe("useResource", () => {
  afterEach(() => {
    cleanup();
    (fetching.doApiRequest as jest.Mock).mockReset();
  });

  test("should fetch data", async () => {
    const Page = () => {
      const { data } = useResource("/items/1/", { fetcher });
      return <div>message: {data && data.message}</div>;
    };
    const { container } = render(<Page />);
    expect(container.firstChild.textContent).toBe("message: ");
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hi");
  });

  test("should mutate data optimistically", async () => {
    const Page = () => {
      const { data, mutate } = useResource("/items/2/", { fetcher });
      return (
        <div onClick={() => mutate({ message: "bye" }, { revalidate: false })}>
          message: {data && data.message}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    // call bound mutate
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: bye");
    expect(fetching.doApiRequest).toBeCalledWith(
      "/items/2/",
      expect.objectContaining({
        method: "PATCH",
        body: { message: "bye" },
      })
    );
  });

  test("should not PATCH with setting", async () => {
    const Page = () => {
      const { data, mutate } = useResource("/items/3/", { fetcher });
      return (
        <div
          onClick={() =>
            mutate(
              { message: "bye" },
              { revalidate: false, sendRequest: false }
            )
          }
        >
          message: {data && data.message}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: bye");
    expect(fetching.doApiRequest).toBeCalledTimes(0);
  });
});
