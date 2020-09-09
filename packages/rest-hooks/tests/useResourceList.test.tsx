import {
  cleanup,
  fireEvent,
  render,
  waitForDomChange,
} from "@testing-library/react";
import React, { ReactElement } from "react";
// @ts-ignore
import useResourceList from "../src/useResourceList";
// @ts-ignore
import * as fetching from "../src/fetching";

interface Elem {
  id: number;
  message: string;
}

const fetcher = (): Elem[] => [
  { id: 1, message: "hello" },
  { id: 2, message: "world" },
];

jest.mock("../src/fetching", () => ({
  doApiRequest: jest.fn(),
}));

describe("useResourceList", () => {
  afterEach(() => {
    cleanup();
    (fetching.doApiRequest as jest.Mock).mockReset();
  });

  test("should fetch data", async () => {
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/1/`,
        (id) => `/items/1/${id}/`,
        {
          fetcher,
        }
      );
      return <div>message: {data && data.map((e) => e.message).join(" ")}</div>;
    };
    const { container } = render(<Page />);
    expect(container.firstChild.textContent).toBe("message: ");
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
  });

  test("should update first element", async () => {
    const num = 2;
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/${num}/`,
        (id) => `/items/1/${num}/`,
        {
          fetcher,
        }
      );
      return (
        <div
          onClick={() => mutate(1, { message: "HELLO" }, { revalidate: false })}
        >
          message: {data && data.map((e) => e.message).join(" ")}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: HELLO world");
  });

  test("should delete element", async () => {
    const num = 3;
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/${num}/`,
        (id) => `/items/${num}/${id}/`,
        {
          fetcher,
        }
      );
      return (
        <div
          onClick={() =>
            mutate(2, null, { method: "DELETE", revalidate: false })
          }
        >
          message: {data && data.map((e) => e.message).join(" ")}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: hello");
    expect(fetching.doApiRequest).toBeCalledWith(
      `/items/${num}/2/`,
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  test("should add new element at front of list", async () => {
    const num = 4;
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/${num}/`,
        (id) => `/items/${num}/${id}/`,
        {
          fetcher,
        }
      );
      return (
        <div
          onClick={() =>
            mutate(
              3,
              { id: 3, message: "Why," },
              { sendRequest: false, revalidate: false, append: true }
            )
          }
        >
          message: {data && data.map((e) => e.message).join(" ")}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: Why, hello world");
    expect(fetching.doApiRequest).toHaveBeenCalledTimes(0);
  });

  test("should add new element at end of list", async () => {
    const num = 5;
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/${num}/`,
        (id) => `/items/${num}/${id}/`,
        {
          fetcher,
        }
      );
      return (
        <div
          onClick={() =>
            mutate(
              3,
              { id: 3, message: "third" },
              {
                sendRequest: false,
                revalidate: false,
                append: true,
                sortBy: (a, b) => a.id - b.id,
              }
            )
          }
        >
          message: {data && data.map((e) => e.message).join(" ")}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: hello world third");
    expect(fetching.doApiRequest).toHaveBeenCalledTimes(0);
  });

  test("should no-op when mutate called with no arguments", async () => {
    const num = 6;
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/${num}/`,
        (id) => `/items/1/${num}/`,
        {
          fetcher,
        }
      );
      return (
        <div onClick={() => mutate()}>
          message: {data && data.map((e) => e.message).join(" ")}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: hello world");
    expect(fetching.doApiRequest).toHaveBeenCalledTimes(0);
  });

  test("should update in append mode if ID exists", async () => {
    const num = 7;
    const Page = () => {
      const { data, mutate } = useResourceList(
        `/items/${num}/`,
        (id) => `/items/${num}/${id}/`,
        {
          fetcher,
        }
      );
      return (
        <div
          onClick={() =>
            mutate(
              1,
              { id: 1, message: "Yo" },
              { sendRequest: false, revalidate: false, append: true }
            )
          }
        >
          message: {data && data.map((e) => e.message).join(" ")}
        </div>
      );
    };
    const { container } = render(<Page />);
    await waitForDomChange({ container });
    expect(container.firstChild.textContent).toBe("message: hello world");
    fireEvent.click(container.firstElementChild);
    expect(container.firstChild.textContent).toBe("message: Yo world");
    expect(fetching.doApiRequest).toHaveBeenCalledTimes(0);
  });
});
