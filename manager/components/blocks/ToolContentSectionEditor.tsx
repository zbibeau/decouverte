'use client';

import type { ContentBlock, ToolContentSectionBlock } from '@shared/content-schema';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

import { ChildBlockList } from './ChildBlockList';
import { Field, Section } from './Field';
import { NavbarVariantSelect } from './NavbarVariantSelect';
import type { PayloadEditorProps } from './editor-types';

type Payload = ToolContentSectionBlock['payload'];

// NB : pas de TagsField sur le toolContentSection lui-même —
// volontaire. Les tags appartiennent aux sous-blocs (vidéo / photo
// dans `children[]`) qui les portent visuellement, pour que
// l'éditeur sache toujours À QUOI un tag est rattaché. Tagger le
// conteneur produisait un champ flottant en bas du bloc dont le
// scope n'était pas évident.

export function ToolContentSectionEditor({
  payload,
  onChange,
  variables,
  navbarVariants,
  depth = 0,
}: PayloadEditorProps<Payload>) {
  const video = payload.video;
  const videoKind = video?.kind ?? 'none';

  const setVideoKind = (k: 'none' | 'fixed' | 'branchOnPersonWhoHandleCalls') => {
    if (k === 'none') {
      const { video: _, ...rest } = payload;
      onChange(rest);
      return;
    }
    if (k === 'fixed') {
      onChange({ ...payload, video: { kind: 'fixed', src: '' } });
      return;
    }
    onChange({
      ...payload,
      video: { kind: 'branchOnPersonWhoHandleCalls' },
    });
  };

  return (
    <div className="space-y-3">
      <Section title="Navbar pilote" accentColor="slate">
        <Field label="Variante" path="navbar">
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
      </Section>

      {/* Le champ `name` (ex « label nav ») n'est plus exposé : le renderer
          Solid ne le lisait jamais (legacy d'une mini-nav latérale interne
          aujourd'hui remplacée par la sidebar gauche + les navbars custom).
          Les anciens payloads continuent de fonctionner — la valeur est
          simplement ignorée. */}
      <Section title="Ancre HTML (facultative)" accentColor="slate">
        <Field
          label="Anchor ID"
          path="anchorId"
          hint="Identifiant pour les liens internes (ex. #section-message). Laisse vide si tu n'utilises pas d'ancres."
        >
          <Input
            value={payload.anchorId ?? ''}
            onChange={(e) => onChange({ ...payload, anchorId: e.target.value })}
            placeholder="section-message"
          />
        </Field>
      </Section>

      <Section title="Titre & sous-titre" accentColor="rose">
        <Field label="Titre" path="title">
          <Input value={payload.title ?? ''} onChange={(e) => onChange({ ...payload, title: e.target.value })} />
        </Field>
        <Field label="Sous-titre" path="subtitle">
          <Input value={payload.subtitle ?? ''} onChange={(e) => onChange({ ...payload, subtitle: e.target.value })} />
        </Field>
      </Section>

      <Section title="Vidéo" accentColor="green">
        <Field label="Mode" path="video">
          <select
            className="border-border flex h-9 w-full rounded-md border bg-white px-3 text-sm"
            value={videoKind}
            onChange={(e) => setVideoKind(e.target.value as 'none' | 'fixed' | 'branchOnPersonWhoHandleCalls')}
          >
            <option value="none">Aucune</option>
            <option value="fixed">Une seule vidéo</option>
            <option value="branchOnPersonWhoHandleCalls">Variantes par personWhoHandleCalls</option>
          </select>
        </Field>

        {video?.kind === 'fixed' && (
          <Field label="Source Vimeo" path="video.src" hint='Format : "vimeo/123456789?hash=abcdef"'>
            <Input
              value={video.src}
              onChange={(e) => onChange({ ...payload, video: { kind: 'fixed', src: e.target.value } })}
            />
          </Field>
        )}

        {video?.kind === 'branchOnPersonWhoHandleCalls' && (
          <div className="border-border/60 bg-muted/30 space-y-2 rounded-md border p-3">
            {(['doctor', 'secretary', 'remote-secretary'] as const).map((k) => (
              <Field key={k} label={`Vidéo pour ${k}`} path={`video.${k}`}>
                <Input
                  value={video[k] ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      video: { ...video, [k]: e.target.value },
                    })
                  }
                  placeholder="vimeo/..."
                />
              </Field>
            ))}
          </div>
        )}
      </Section>

      <Section title="Bloc avantages" accentColor="amber">
        <Field label="Titre du bloc avantages" path="advantageTitle">
          <Input
            value={payload.advantageTitle ?? ''}
            onChange={(e) => onChange({ ...payload, advantageTitle: e.target.value })}
            placeholder="Les avantages"
          />
        </Field>

        <Field
          label="Points (1 par ligne)"
          path="advantagePoints"
          hint="Utilisé si rempli. Sinon, fallback sur le paragraphe ci-dessous."
        >
          <Textarea
            rows={4}
            value={(payload.advantagePoints ?? []).join('\n')}
            onChange={(e) =>
              onChange({
                ...payload,
                advantagePoints: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>

        <Field label="Paragraphe avantages (alternative)" path="advantageText">
          <Textarea
            rows={3}
            value={payload.advantageText ?? ''}
            onChange={(e) => onChange({ ...payload, advantageText: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="Sous-blocs additionnels" accentColor="purple">
        <Field
          label=""
          path="children"
          hint="Ces blocs sont rendus APRÈS la carte avantages. Tu peux y mettre du texte, des key points, une FAQ, etc."
        >
          <ChildBlockList
            blocks={(payload.children ?? []) as ContentBlock[]}
            onChange={(next) => onChange({ ...payload, children: next })}
            variables={variables}
            depth={depth + 1}
            scopeLabel="Tool section > sous-blocs"
          />
        </Field>
      </Section>
    </div>
  );
}
