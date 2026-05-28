import { MfmLoaderBlock } from '@/components/ui/MfmLoader';

/**
 * Block editor loading boundary. The page fetches the block payload +
 * variables list + navbar variants + tag attachments. Critical UX
 * point : the editor often clicks « Éditer → » on a block and expects
 * the editor to open RIGHT NOW. Without this fallback, the previous
 * page stayed visible for ~500 ms which felt like the click didn't
 * register.
 */
export default function Loading() {
  return <MfmLoaderBlock label="Ouverture du bloc…" size="md" />;
}
