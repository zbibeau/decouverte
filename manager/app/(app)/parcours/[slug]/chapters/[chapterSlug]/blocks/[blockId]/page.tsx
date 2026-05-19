import type { ContentBlock } from '@shared/content-schema';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockEditor } from '@/components/BlockEditor';
import { Button } from '@/components/ui/Button';
import {
  getBlockDraftDiff,
  getDraftStatus,
  getEditingVersionId,
  getNavbarVariants,
  updateBlockPayload,
} from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

export default async function BlockEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; chapterSlug: string; blockId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const chapterSlug = decodeURIComponent(raw.chapterSlug);
  const blockId = raw.blockId;
  const sp = await searchParams;
  const isNew = sp.new === '1';
  const supabase = await createClient();

  const { data: block } = await supabase
    .from('block')
    .select('id, type, payload, "order"')
    .eq('id', blockId)
    .maybeSingle();

  if (!block) notFound();

  // Sibling blocks of the same chapter — needed by the editor to figure out
  // which variables are actually referenced by the previewed chapter.
  const { data: chapterRow } = await supabase
    .from('block')
    .select('chapter_id')
    .eq('id', blockId)
    .maybeSingle();
  const { data: chapterBlocksRows } = await supabase
    .from('block')
    .select('id, "order", type, payload')
    .eq('chapter_id', chapterRow?.chapter_id)
    .is('parent_block_id', null)
    .order('order', { ascending: true });
  const chapterBlocks = (chapterBlocksRows ?? []).map((b) => ({
    id: b.id,
    type: b.type,
    payload: (b.payload ?? {}) as Record<string, unknown>,
  })) as unknown as ContentBlock[];

  const { data: parcoursRow } = await supabase
    .from('parcours')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const { data: variablesRows } = await supabase
    .from('variable')
    .select('id, key, label, type, options')
    .eq('parcours_id', parcoursRow?.id)
    .order('key', { ascending: true });

  const variables = (variablesRows ?? []).map((v) => ({
    id: v.id,
    key: v.key,
    label: v.label,
    type: v.type as 'boolean' | 'enum' | 'string' | 'number',
    options: (v.options as Array<{ value: string; label: string }>) ?? [],
  }));

  async function saveAction(payload: Record<string, unknown>): Promise<string> {
    'use server';
    return await updateBlockPayload(slug, chapterSlug, blockId, payload);
  }

  // Draft id (if any) so the iframe previews the draft version, not the live.
  const draftStatus = await getDraftStatus(slug);
  // Diff info for the "Modifications du brouillon" review panel.
  const blockDiff = await getBlockDraftDiff(blockId);

  // List of chapters for dropdowns like `nextStep` in FormEditor.
  const editingVersionId = await getEditingVersionId(slug);
  const { data: allChapters } = await supabase
    .from('chapter')
    .select('id, slug, title, "order", section_label, section_order')
    .eq('version_id', editingVersionId ?? '')
    .order('order', { ascending: true });
  const chapters = (allChapters ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    sectionLabel: (c as { section_label?: string | null }).section_label ?? null,
    sectionOrder: (c as { section_order?: number | null }).section_order ?? null,
  }));

  // Navbar variants registered on this parcours — fed to editors that expose
  // a `navbar.variant` dropdown (video, card, faqCard, keyPointsCard).
  const navbarVariants = await getNavbarVariants(slug);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/parcours/${slug}/chapters/${chapterSlug}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au chapitre
          </Button>
        </Link>
        <h2 className="mt-3 text-lg font-semibold">
          Bloc <span className="font-mono text-sm">{block.type}</span>
          <span className="ml-2 text-xs text-muted-foreground">(position {block.order})</span>
        </h2>
      </div>

      <BlockEditor
        blockId={blockId}
        chapterSlug={chapterSlug}
        parcoursSlug={slug}
        isNew={isNew}
        type={block.type as ContentBlock['type']}
        initialPayload={(block.payload ?? {}) as Record<string, unknown>}
        variables={variables}
        chapterBlocks={chapterBlocks}
        saveAction={saveAction}
        editingVersionId={draftStatus.draftVersionId}
        publishedVersionId={draftStatus.publishedVersionId}
        draftStatus={blockDiff.status}
        sourcePayload={blockDiff.sourcePayload}
        chapters={chapters}
        navbarVariants={navbarVariants}
      />
    </div>
  );
}
