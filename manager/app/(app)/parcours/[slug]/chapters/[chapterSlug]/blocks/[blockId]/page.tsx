import { redirect } from 'next/navigation';

/**
 * The standalone per-block editor has been folded into the unified chapter
 * view (`ChapterEditor`): the left list expands each block into its inline
 * editor, the right pane is a single shared preview, and the two scroll in
 * sync. This route now just redirects any deep-link to a block (⌘K results,
 * the pre-publish tag-review modal, the parcours-home chapter list, old
 * bookmarks…) to that chapter with the block pre-opened via `?block=<id>`.
 */
export default async function BlockEditRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; chapterSlug: string; blockId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const chapterSlug = decodeURIComponent(raw.chapterSlug);
  const blockId = raw.blockId;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  qs.set('block', blockId);
  if (sp.q) qs.set('q', sp.q);

  redirect(`/parcours/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterSlug)}?${qs.toString()}`);
}
