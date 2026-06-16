'use client';

import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Aperçu d'une image éditée dans un Field (Hero illustration, Card
 * image, etc.). Affiche un placeholder propre au lieu de la croix
 * browser quand :
 *   - `src` est vide ou absent
 *   - l'image renvoyée échoue à charger (404, CORS, format non
 *     supporté…)
 *
 * Avant : `<img src={...} alt="Aperçu…" />` direct → quand l'URL
 * pointait vers un fichier inexistant côté front, le navigateur
 * affichait son icône cassée par défaut + le texte alt sur la
 * gauche, ce qui faisait sale dans le panneau d'édition.
 *
 * Après : on intercepte l'event `onError` de l'<img>, on flippe
 * un state local et on remplace le rendu par un bloc à la
 * marque (border violet pâle, icône ImageOff centrée, label
 * "Image introuvable").
 *
 * Utilisation :
 *   <ImagePreview src={url} alt="…" />
 *
 * Le caller passe `objectFit` selon le contexte (cover pour les
 * cartes, contain pour les illustrations hero qui doivent rester
 * entières).
 */
export function ImagePreview({
  src,
  alt,
  objectFit = 'contain',
  className,
}: {
  src?: string | null;
  alt?: string;
  objectFit?: 'cover' | 'contain';
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  // Reset l'état d'erreur quand le src change — sans ça, si l'utilisateur
  // colle une URL cassée puis la corrige, le placeholder reste affiché à
  // tort jusqu'au reload de la page.
  useEffect(() => {
    setErrored(false);
  }, [src]);

  const hasSrc = typeof src === 'string' && src.length > 0;
  const showPlaceholder = !hasSrc || errored;

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          // Fond doux + bordure dashed pour matérialiser que c'est un
          // état d'attente / d'erreur (pas un vrai contenu).
          'border-border-strong/40 text-text-muted bg-surface-2 flex h-32 w-full items-center justify-center gap-2 rounded border border-dashed',
          className,
        )}
        title={hasSrc ? `Image introuvable : ${src}` : 'Aucune image renseignée'}
      >
        <ImageOff className="h-4 w-4 shrink-0" />
        <span className="text-xs">{hasSrc ? 'Image introuvable' : 'Aucune image'}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? ''}
      alt={alt ?? ''}
      onError={() => setErrored(true)}
      className={cn(
        'border-border mt-1 h-32 w-auto rounded border',
        objectFit === 'cover' ? 'object-cover' : 'object-contain',
        className,
      )}
    />
  );
}
