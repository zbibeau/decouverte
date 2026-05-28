import { MfmLoaderBlock } from '@/components/ui/MfmLoader';

/**
 * Chapter detail loading boundary. The page itself fetches blocks +
 * tag attachments + navbar metadata — a few hundred ms even on warm
 * cache. With this fallback, a click on a chapter in the ChapterList
 * surfaces the loader instantly while the data streams in.
 */
export default function Loading() {
  return <MfmLoaderBlock label="Chargement du chapitre…" size="md" />;
}
