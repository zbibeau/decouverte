import { MfmLoaderBlock } from '@/components/ui/MfmLoader';

/**
 * Parcours-shell loading boundary. Renders while the parcours layout
 * (`layout.tsx`) is still resolving its data — currently a parcours
 * SELECT + `listVersions` + `getDraftStatus` running in parallel. The
 * first navigation INTO a parcours after the sidebar list loads goes
 * through this fallback, so the click on a parcours name → loader
 * transition is immediate even on cold cache.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10">
      <MfmLoaderBlock label="Chargement du parcours…" size="md" />
    </div>
  );
}
