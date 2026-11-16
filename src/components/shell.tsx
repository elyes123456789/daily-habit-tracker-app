import type { PropsWithChildren } from 'react';

/** Native apps use the platform tab bar; only the web build adds a desktop sidebar. */
export function Shell({ children }: PropsWithChildren) {
  return children;
}
