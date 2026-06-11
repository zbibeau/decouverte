'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const STORAGE_KEY = 'manager:theme';

/**
 * Segmented control Clair / Sombre — version « row » dédiée à la page
 * Réglages (vs le picto compact `ThemeToggle` utilisé dans la sidebar).
 *
 * Logique de persistence identique au `ThemeToggle` (toggle classe
 * `.dark` sur `<html>` + localStorage `manager:theme`). Le composant
 * partagé `ThemeBootstrap` lit la clé au boot avant hydration → pas
 * de flash.
 *
 * Gate `mounted` pour éviter le mismatch SSR (qui ne connaît pas le
 * thème). Avant l'hydratation on rend un placeholder neutre.
 */
export function ThemeToggleRow() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function setTheme(next: boolean) {
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }

  const dark = mounted && isDark;
  return (
    <div className="bg-surface-2 inline-flex gap-0.5 rounded-md p-0.5">
      <button
        type="button"
        onClick={() => setTheme(false)}
        aria-pressed={mounted ? !isDark : false}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-xs font-medium transition-colors',
          !dark ? 'bg-surface text-text shadow-app-sm' : 'text-text-muted hover:text-text',
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        Clair
      </button>
      <button
        type="button"
        onClick={() => setTheme(true)}
        aria-pressed={mounted ? isDark : false}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-xs font-medium transition-colors',
          dark ? 'bg-surface text-text shadow-app-sm' : 'text-text-muted hover:text-text',
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        Sombre
      </button>
    </div>
  );
}
