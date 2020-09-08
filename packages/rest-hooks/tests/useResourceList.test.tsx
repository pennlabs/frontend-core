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

describe("useResourceList", () => {
  afterEach(() => {
    cleanup();
    (fetching.doApiRequest as jest.Mock).mockReset();
  });
});
