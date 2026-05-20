import { useLocation } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';

/**
 * Standalone "isolated block preview" route used by the manager when a user
 * is CREATING a new block. The iframe is loaded at this URL with the block
 * id and type as query params; the actual payload is then pushed via
 * postMessage and applied as an override in the renderer.
 *
 * URL: /preview-block?preview=1&id=<uuid>&type=<blockType>&<simulator vars>
 *
 * The whole rendering tree is loaded via `clientOnly` so we don't deal with
 * SSR/hydration mismatch — the manager just needs a live editable canvas,
 * not an SEO-optimized page.
 */
const ClientPreview = clientOnly(() => import('../components/modules/home/renderer/IsolatedBlockPreviewPage'));

export default function PreviewBlockRoute() {
  const location = useLocation();
  return (
    <main>
      <ClientPreview
        blockId={(location.query.id as string) ?? ''}
        blockType={(location.query.type as string) ?? 'text'}
      />
    </main>
  );
}
