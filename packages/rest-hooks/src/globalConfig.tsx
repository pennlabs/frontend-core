import React, { createContext, ReactNode } from "react";
import { ConfigInterface } from "swr";

export type fetcherFn<R> = (...args: any) => R | Promise<R>;

interface Config<D = any, Fn extends fetcherFn<D> = fetcherFn<D>> {
  fetcher?: Fn;
}

export const GlobalConfigContext = createContext<Config | undefined>(undefined);

type GlobalConfigProps = {
  config?: Config;
  children: ReactNode;
};

// Configuration priorities from highest to lowest (currently only for fetching)
// hook-specific config -> GlobalConfig -> SWRConfig

export function getBestFetcher<R>(
  config?: ConfigInterface<R>,
  globalConfig?: Config<R>
) {
  let fetcher: fetcherFn<R> | undefined;

  if (config?.fetcher) {
    fetcher = config.fetcher;
  } else if (globalConfig?.fetcher) {
    fetcher = globalConfig.fetcher;
  }

  return fetcher;
}

export const GlobalConfig = ({ config, children }: GlobalConfigProps) => {
  <GlobalConfigContext.Provider value={config}>
    {children}
  </GlobalConfigContext.Provider>;
};
