import { configureStore } from '@reduxjs/toolkit';
import { marketplaceApi } from './api';

/**
 * A factory rather than a module-level singleton: on the server a shared store
 * would leak one user's cached data into the next request's render.
 */
export function makeStore() {
  return configureStore({
    reducer: {
      [marketplaceApi.reducerPath]: marketplaceApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(marketplaceApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
