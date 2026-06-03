'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const STORAGE_KEY = 'manager:theme';

/**
 * Bouton lune/soleil qui bascule la classe `.dark` sur `<html>` et persiste
 * le choix dans `localStorage` (lu au boot par `ThemeBootstrap` pour éviter
 * le flash). Sans framework — un useEffect, un onClick, c'est tout.
 *
 * `mounted` gate le rendu de l'icône pour ne pas mismatch entre le serveur
 * (qui ne connaît pas le thème) et le client (qui lui le sait). Avant
 * l'hydratation on rend un slot transparent de la bonne taille pour ne pas
 * pousser la layout au mount.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      /* localStorage indisponible — change quand même pour la session courante */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={mounted ? (isDark ? 'Passer en clair' : 'Passer en sombre') : 'Thème'}
      aria-label={mounted ? (isDark ? 'Passer en clair' : 'Passer en sombre') : 'Thème'}
      className={cn(
        'text-rail-muted hover:text-rail-text inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]',
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
