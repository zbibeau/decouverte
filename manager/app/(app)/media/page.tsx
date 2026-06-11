import { Construction, ImageIcon, Video } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

/**
 * Bibliothèque média — placeholder Direction B (handoff §4 mentionne
 * « Bibliothèque média 84 » dans la section Studio de la sidebar).
 *
 * Pas de fonctionnalité backing actuellement : les médias (images,
 * vidéos Vimeo, illustrations) vivent en Supabase Storage + sont
 * référencés inline dans les payloads des blocs. Il n'y a pas
 * d'index agrégé.
 *
 * Cette page existe pour réserver la route et fournir un point
 * d'entrée visible dans la sidebar Studio. Quand on aura un vrai
 * inventaire (compte de fichiers Storage, déduplication, audit
 * "orphans"…) on remplacera ce placeholder.
 */
export default async function MediaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-8">
      <header>
        <div className="text-text-faint mb-1.5 text-[11px] font-semibold uppercase tracking-wider">Studio</div>
        <h1 className="text-text text-[26px] font-bold leading-tight tracking-tight">Bibliothèque média</h1>
        <p className="text-text-muted mt-1.5 max-w-2xl text-sm">
          Vue agrégée des images, vidéos et illustrations utilisées par tous les parcours.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="bg-surface-2 border-border text-text-faint inline-flex h-14 w-14 items-center justify-center rounded-xl border">
            <Construction className="h-6 w-6" />
          </div>
          <div className="max-w-md">
            <p className="text-text text-base font-semibold">Bientôt disponible</p>
            <p className="text-text-muted mt-2 text-sm">
              La bibliothèque média agrégera images Storage, vidéos Vimeo référencées et illustrations utilisées dans
              tous les parcours — avec audit des orphelins et déduplication.
            </p>
            <p className="text-text-faint mt-3 text-xs">
              En attendant, les médias se gèrent inline dans chaque bloc (upload via Supabase Storage, URLs Vimeo).
            </p>
          </div>
          <div className="text-text-faint mt-2 flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Images
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              Vidéos Vimeo
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
