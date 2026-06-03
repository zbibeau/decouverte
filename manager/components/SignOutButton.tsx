'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      // Bouton vit dans la sidebar graphite — `hover:bg-muted` (clair) ne
      // marchait plus en thème sombre/graphite. On utilise les classes rail.
      className="text-rail-muted hover:text-rail-text inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
      title="Se déconnecter"
    >
      {children}
    </button>
  );
}
