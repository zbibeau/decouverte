import type { ContentBlock, ToolContentSectionBlock } from '@shared/content-schema';
import { Component, For, JSX, Show } from 'solid-js';

import { KeywordItalic } from '../../../atoms/KeywordItalic';
import { CheckListItem } from '../../../molecules/CheckListItem';
import { defaultVideoI18nPropsFR, Video } from '../../../primitives/Video';
import { AfterHeroContainerWide } from './AfterHeroContainer';

type Payload = ToolContentSectionBlock['payload'];

/** Renders a `toolContentSection` block.
 *
 * `renderChild` is passed in by the parent dispatcher (ChapterRenderer)
 * so we can render `payload.children` without creating a circular import
 * back to ChapterRenderer's RenderBlock.
 */
export const ToolContentSection: Component<{
  payload: Payload;
  personWhoHandleCalls?: string;
  renderChild?: (block: ContentBlock) => JSX.Element;
  /** Optional pilot-specific navbar passed by the dispatcher, rendered as
   *  `preChildren` of the `AfterHeroContainerWide` wrapper. */
  navbar?: JSX.Element;
}> = (props) => {
  const resolvedVideoSrc = () => {
    const v = props.payload.video;
    if (!v) return undefined;
    if (v.kind === 'fixed') return v.src;
    const key = (props.personWhoHandleCalls ?? '') as 'doctor' | 'secretary' | 'remote-secretary';
    return v[key];
  };

  return (
    <AfterHeroContainerWide contentId={props.payload.anchorId} preChildren={props.navbar}>
      <div class="mx-auto w-full py-6 md:py-12">
        <div class="m-auto w-full max-w-[800px] space-y-8 px-3 md:px-1">
          <div class="space-y-8">
            {/* Titre + sous-titre — refonte handoff §5-7.
                Split sur `\n` : la 2e ligne du titre est rendue en
                KeywordItalic primary-600 (« Un *filtre* multicanal. »).
                Le subtitle (champ séparé du schéma) reste rendu en
                paragraphe sobre `violet.text`. Centered desktop, left
                mobile. */}
            <div data-field-rail="title" class="space-y-2">
              {(() => {
                const lines = props.payload.title
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean);
                return (
                  <h2
                    class="text-[clamp(28px,6vw,46px)] font-black leading-[1.05] tracking-[-0.03em] text-primary-950"
                    data-field-path="title"
                  >
                    {lines[0] ?? props.payload.title}
                    <Show when={lines.length > 1}>
                      <br />
                      <KeywordItalic>{lines.slice(1).join(' ')}</KeywordItalic>
                    </Show>
                  </h2>
                );
              })()}
              <Show when={props.payload.subtitle}>
                <p class="text-base leading-relaxed text-violet-text" data-field-path="subtitle">
                  {props.payload.subtitle}
                </p>
              </Show>
            </div>

            <Show when={resolvedVideoSrc()}>
              {(src) => (
                <div class="mx-auto w-full" data-field-path="video" data-field-rail="video">
                  <Video src={src()} class="rounded-3xl shadow-premium" i18n={defaultVideoI18nPropsFR} />
                </div>
              )}
            </Show>

            <Show when={props.payload.advantagePoints?.length || props.payload.advantageText}>
              <div data-field-path="advantagePoints" data-field-rail="advantages">
                {/* Carte « Les avantages » — refonte handoff §5-7. Au
                    lieu d'une Card boxée avec ombre + header en icône,
                    on rend une bordure douce et des checks alternants
                    violet/ocre matchant le style de la maquette. */}
                <div class="space-y-3 rounded-2xl border border-violet-border-soft bg-white p-5 shadow-card">
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-500"
                    data-field-path="advantageTitle"
                  >
                    {props.payload.advantageTitle ?? 'Les avantages'}
                  </p>
                  <Show when={props.payload.advantagePoints?.length}>
                    <div class="space-y-2">
                      <For each={props.payload.advantagePoints}>
                        {(p, i) => <CheckListItem variant={i() % 2 === 0 ? 'primary600' : 'ocre'} text={p} />}
                      </For>
                    </div>
                  </Show>
                  <Show when={props.payload.advantageText}>
                    <p class="text-violet-text" data-field-path="advantageText">
                      {props.payload.advantageText}
                    </p>
                  </Show>
                </div>
              </div>
            </Show>

            <Show when={(props.payload.children?.length ?? 0) > 0 && props.renderChild}>
              <div class="space-y-6" data-field-path="children" data-field-rail="children">
                <For each={props.payload.children ?? []}>{(child) => props.renderChild!(child)}</For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </AfterHeroContainerWide>
  );
};
