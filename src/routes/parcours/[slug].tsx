import Home from '../index';

/**
 * Multi-parcours route. `/parcours/<slug>` renders the same Home UI as
 * `/`. The parcours slug is sourced from the URL by `RoutedHomeProvider`
 * in `app.tsx`, so the Home component itself doesn't need to know — it
 * just reads `useHome().parcoursSlug()` like everywhere else.
 *
 * We import the function and re-export it as default (instead of the
 * shorter `export { default } from '../index'`) because Solid Start's
 * file-router doesn't always resolve re-exported defaults at SSR time —
 * the explicit import gives Vinxi a real function reference to bundle.
 */
export default function ParcoursRoute() {
  return <Home />;
}
