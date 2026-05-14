import { ChapterList } from '@/components/ChapterList';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  createChapter,
  deleteChapter,
  duplicateChapter,
  getDraftChapterDiffs,
  getEditingVersionId,
  reorderChapters,
} from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';

export default async function ChapterListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const supabase = await createClient();

  // Prefer the draft version when one exists, fall back to published.
  const versionId = await getEditingVersionId(slug);

  const { data: chapters } = await supabase
    .from('chapter')
    .select('id, slug, title, "order"')
    .eq('version_id', versionId ?? '')
    .order('order', { ascending: true });

  const createChapterAction = createChapter.bind(null, slug);

  async function reorderChaptersAction(orderedIds: string[]) {
    'use server';
    await reorderChapters(slug, orderedIds);
  }
  async function deleteChapterAction(chapterId: string) {
    'use server';
    await deleteChapter(slug, chapterId);
  }
  async function duplicateChapterAction(chapterId: string) {
    'use server';
    return await duplicateChapter(slug, chapterId);
  }

  const diffs = await getDraftChapterDiffs(slug);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chapitres</CardTitle>
          <p className="text-xs text-muted-foreground">{(chapters ?? []).length} chapitre(s)</p>
        </CardHeader>
        <CardContent>
          <ChapterList
            parcoursSlug={slug}
            chapters={(chapters ?? []).map((c) => ({
              id: c.id,
              slug: c.slug,
              title: c.title,
              order: c.order,
              diff: diffs.get(c.id),
            }))}
            reorderAction={reorderChaptersAction}
            deleteAction={deleteChapterAction}
            duplicateAction={duplicateChapterAction}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un chapitre</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createChapterAction} className="flex flex-col gap-3 sm:flex-row">
            <Input name="slug" placeholder="STEP_NEW_THING" required className="sm:max-w-[200px]" />
            <Input name="title" placeholder="Titre du chapitre" required className="flex-1" />
            <Button type="submit">Créer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
