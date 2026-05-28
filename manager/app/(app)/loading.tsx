import { MfmLoaderBlock } from '@/components/ui/MfmLoader';

/**
 * App-shell-level loading boundary. Next.js renders this instantly when
 * the user clicks a Link that navigates inside the (app) group while
 * the destination's server components are still resolving. Without it,
 * the click had no visual feedback — the sidebar item highlight didn't
 * update until the new page's data finished fetching (sometimes 1-2 s
 * on cold cache). Now the click → loader transition is sub-100ms.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10">
      <MfmLoaderBlock label="Chargement…" size="md" />
    </div>
  );
}
