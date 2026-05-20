import '../scss/index.scss';

import { Link, Meta, MetaProvider } from '@solidjs/meta';
import { Router, useLocation } from '@solidjs/router';
// eslint-disable-next-line import/no-unresolved
import { FileRoutes } from '@solidjs/start/router';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { fr } from 'date-fns/locale';
import { RosettyProvider } from 'rosetty-solid';
import { createEffect, JSX, Suspense } from 'solid-js';

import { DEFAULT_PARCOURS_SLUG, HomeProvider } from './components/modules/home/context/HomeContext';
import { frI18n } from './lang/fr';
import { useI18n } from './lang/useI18n';
import { MetaTagsDescription, MetaTagsTitle } from './services/seo';

const queryClient = new QueryClient();

const locales = { fr: { dict: frI18n, locale: fr } };
const defaultLanguage = 'fr';

/**
 * Resolve the parcours slug from the current URL path:
 *   /parcours/<slug>            → slug
 *   /parcours/<slug>/anything   → slug
 *   /                           → DEFAULT_PARCOURS_SLUG ('demo-ventes')
 *
 * The function is reactive (uses Solid's `useLocation`) so navigating
 * between parcours via `<A>` updates the provider seamlessly.
 */
function RoutedHomeProvider(props: { children: JSX.Element }) {
  const loc = useLocation();
  const slugFromPath = () => {
    const parts = loc.pathname.split('/').filter(Boolean);
    if (parts[0] === 'parcours' && parts[1]) return decodeURIComponent(parts[1]);
    return DEFAULT_PARCOURS_SLUG;
  };
  return <HomeProvider parcoursSlug={slugFromPath()}>{props.children}</HomeProvider>;
}

const EmbeddedApp = () => {
  const i18n = useI18n();

  createEffect(() => {
    document.documentElement.setAttribute('lang', i18n().actualLang()!);
  });

  return (
    <>
      <MetaTagsTitle value={i18n().t('global.seo.title')!} />
      <MetaTagsDescription value={i18n().t('global.seo.description')!} />
      <Link rel="icon" href="favicon.ico" />
      {/* LCP : the cream watercolour background applied on every chapter
          via `StepperLayout`'s inline style is one of the largest and
          earliest-painted images. Preloading it tells the browser to
          fetch it in parallel with the HTML / JS, which usually shaves
          ~200ms off Largest Contentful Paint on 4G connections.
          `fetchpriority="high"` further hints the browser this is a
          first-paint critical asset. */}
      <Link rel="preload" as="image" href="/background/bg-hero-content.webp" fetchpriority="high" />
      {/*
        HomeProvider is now mounted INSIDE the Router so it can read the
        active URL via `useLocation()` and derive the parcours slug from
        it (`/parcours/<slug>` → slug ; anything else → DEFAULT slug).
      */}
      <Router
        root={(props) => (
          <Suspense>
            <RoutedHomeProvider>{props.children}</RoutedHomeProvider>
          </Suspense>
        )}
      >
        <FileRoutes />
      </Router>
    </>
  );
};

export default function Root() {
  return (
    <>
      <MetaProvider>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <QueryClientProvider client={queryClient}>
          <RosettyProvider languages={locales} defaultLanguage={defaultLanguage}>
            <EmbeddedApp />
          </RosettyProvider>
        </QueryClientProvider>
      </MetaProvider>
    </>
  );
}
