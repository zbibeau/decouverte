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

  const { data: parcours } = await supabase
    .from('parcours')
    .select('id, slug, name')
    .order('created_at', { ascending: true });

  return (
    <AddActionsProvider>
      <div className="flex min-h-screen">
        <Sidebar email={user.email ?? ''} parcours={parcours ?? []} />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <CommandPalette />
      </div>
    </AddActionsProvider>
  );
}
