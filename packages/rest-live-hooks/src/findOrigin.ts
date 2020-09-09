export const SITE_ORIGIN = (): string =>
  typeof window !== "undefined"
    ? window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
      ? `ws://${window.location.host}`
      : `wss://${window.location.host}`
    : "";
