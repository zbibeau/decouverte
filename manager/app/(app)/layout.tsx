import { redirect } from 'next/navigation';

import { AddActionsProvider } from '@/components/blocks/AddActionsContext';
import { CommandPalette } from '@/components/CommandPalette';
import { Sidebar } from '@/components/Sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Try selecting with `theme_color` ; fall back to the legacy 3-column
  // select if the column doesn't exist yet on this DB (migration 0035
  // not applied). Same defensive pattern as `createParcours` so the
  // sidebar keeps loading even on schema-drifted environments.
  let parcoursRows:
    | Array<{ id: string; slug: string; name: string; theme_color?: string | null }>
    | null = null;
  {
    const { data, error } = await supabase
      .from('parcours')
      .select('id, slug, name, theme_color')
      .order('created_at', { ascending: true });
    if (error && /column .*theme_color.* does not exist/i.test(error.message)) {
      const fallback = await supabase
        .from('parcours')
        .select('id, slug, name')
        .order('created_at', { ascending: true });
      parcoursRows = (fallback.data ?? []).map((r) => ({ ...r }));
    } else {
      parcoursRows = data ?? null;
    }
  }
  const parcoursItems = (parcoursRows ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    themeColor: p.theme_color ?? null,
  }));

  return (
    <AddActionsProvider>
      <div className="flex min-h-screen">
        <Sidebar email={user.email ?? ''} parcours={parcoursItems} />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <CommandPalette />
      </div>
    </AddActionsProvider>
  );
}
