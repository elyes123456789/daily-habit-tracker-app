import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web only. Renders the HTML shell for every statically exported page; runs in Node, not the browser.

/** Set when the site is hosted under a sub-path (see app.config.js). */
const base = process.env.EXPO_BASE_URL ?? '';

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Daily Habit Tracker App</title>
        <meta name="description" content="A calm, local-first daily habit tracker. Your data stays on this device." />
        <meta name="theme-color" content="#F5F1E8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#161512" media="(prefers-color-scheme: dark)" />
        <link rel="manifest" href={`${base}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${base}/icons/icon-192.png`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: background }} />
        {process.env.NODE_ENV === 'production' ? <script dangerouslySetInnerHTML={{ __html: serviceWorker }} /> : null}
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

// Paints the page background before the app loads, so there is no white flash in dark mode.
const background = `
body { background-color: #F5F1E8; }
@media (prefers-color-scheme: dark) { body { background-color: #161512; } }
`;

const serviceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('${base}/sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function (registration) {
      var urls = performance.getEntriesByType('resource').map(function (entry) { return entry.name; });
      registration.active.postMessage({ cache: urls.concat(location.href) });
    }).catch(function () { /* offline support is optional */ });
  });
}
`;
