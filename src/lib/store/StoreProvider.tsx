'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore } from './index';

/**
 * Creates the store once per client mount, so a re-render never swaps the store
 * out from under the cache. The lazy `useState` initialiser is what holds it —
 * a ref would have to be read during render, which React 19 flags.
 *
 * `setupListeners` is what gives us refetch-on-reconnect and refetch-on-focus —
 * a user coming back to the tab sees current bids, not a stale snapshot.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);

  useEffect(() => setupListeners(store.dispatch), [store]);

  return <Provider store={store}>{children}</Provider>;
}
