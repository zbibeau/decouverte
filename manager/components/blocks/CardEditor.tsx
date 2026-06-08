'use client';

import type { ContentBlock } from '@shared/content-schema';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { uploadImageDirect } from '@/lib/uploadImageClient';

import { ChildBlockList } from './ChildBlockList';
import { Field } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import type { PayloadEditorProps } from './editor-types';

type CardPayload = {
  navbar?: { variant: string };
  contentClass?: string;
  image?: string;
  imageAlt?: string;
  children: ContentBlock[];
};

export function CardEditor({
  payload,
  onChange,
  variables,
  navbarVariants,
  depth = 0,
}: PayloadEditorProps<CardPayload>) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const res = await uploadImageDirect(file);
      if (!res.ok || !res.url) {
        toast.error(res.error || 'Upload échoué.');
        return;
      }
      onChange({ ...payload, image: res.url });
      toast.success('Image uploadée.');
    } catch (e) {
      console.error('[CardEditor] image upload failed', e);
      toast.error(`Upload échoué : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Navbar pilote" path="navbar">
        <NavbarVariantSelect
          value={payload.navbar?.variant}
          onChange={(key) =>
            onChange({
              ...payload,
              navbar: key ? { variant: key } : undefined,
            })
          }
          variants={navbarVariants}
        />
      </Field>

      <Field label="Image de couverture" path="image" hint="Image de couverture, arrondie en haut.">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={payload.image ?? ''}
            onChange={(e) => onChange({ ...payload, image: e.target.value || undefined })}
            placeholder="URL ou upload"
            className="h-8 flex-1 text-xs"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            title="Uploader une image"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? '…' : ''}
          </Button>
          {payload.image && (
            <div className="basis-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payload.image}
                alt={payload.imageAlt ?? 'Aperçu image carte'}
                className="border-border mt-1 h-32 w-auto rounded-lg border object-cover"
              />
            </div>
          )}
        </div>
      </Field>

      {payload.image && (
        <Field label="Texte alternatif (alt)" path="imageAlt" hint="Décris pour l'accessibilité. Vide = décorative.">
          <Input
            value={payload.imageAlt ?? ''}
            onChange={(e) => onChange({ ...payload, imageAlt: e.target.value || undefined })}
            placeholder="Ex. : Un médecin consulte un dossier patient."
            className="h-8 text-xs"
          />
        </Field>
      )}

      <Field label="Blocs enfants" path="children">
        <ChildBlockList
          blocks={payload.children}
          onChange={(children) => onChange({ ...payload, children })}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
          scopeLabel="Card"
        />
      </Field>
    </div>
  );
}
