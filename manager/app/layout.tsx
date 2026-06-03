import './globals.css';

import type { Metadata } from 'next';
import { Figtree, JetBrains_Mono } from 'next/font/google';

import { ThemeBootstrap } from '@/components/ThemeBootstrap';
import { ToastProvider } from '@/components/Toaster';

// Direction Studio polices :
//   - Figtree : UI + titres (variable --font-figtree, alimente la `sans`).
//   - JetBrains Mono : slugs, IDs, identifiants vidéo (variable --font-jetbrains).
// Chargées via `next/font/google` → self-hosted + variables CSS, pas de CLS
// ni de roundtrip réseau supplémentaire à l'exécution.
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Découverte autonome — Manager',
  description: 'Éditeur de parcours',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` parce que `ThemeBootstrap` ajoute la classe
    // `.dark` avant l'hydratation React via un script inline — sans le flag,
    // Next aboie au mismatch (HTML serveur sans `.dark`, HTML client avec).
    <html lang="fr" className={`${figtree.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body className="bg-bg text-text min-h-screen font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
