import { Component, For, JSX, Show } from 'solid-js';

import type { ContentBlock, ToolContentSectionBlock } from '@shared/content-schema';

import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { CheckListItem } from '../../../molecules/CheckListItem';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
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
    <AfterHeroContainerWide
      contentId={props.payload.anchorId}
      preChildren={props.navbar}
    >
      <div class="mx-auto w-full py-6 md:py-12">
        <div class="m-auto w-full max-w-[800px] space-y-8 px-3 md:px-1">
          <div class="space-y-8">
            <div data-field-rail="title">
              <Title variant="h2" class="text-center" data-field-path="title">
                {props.payload.title}
              </Title>
              <Show when={props.payload.subtitle}>
                <Text variant="xl" class="text-center text-primary-500" data-field-path="subtitle">
                  {props.payload.subtitle}
                </Text>
              </Show>
            </div>

            <Show when={resolvedVideoSrc()}>
              {(src) => (
                <div class="mx-auto w-full" data-field-path="video" data-field-rail="video">
                  <Video src={src()} class="rounded-3xl" i18n={defaultVideoI18nPropsFR} />
                </div>
              )}
            </Show>

            <Show when={props.payload.advantagePoints?.length || props.payload.advantageText}>
              <div data-field-path="advantagePoints" data-field-rail="advantages">
                <Card>
                  <div class="space-y-4">
                    <div class="flex items-center gap-2">
                      <div>
                        <Icon icon="icon icon-check-line" variant="secondary100Icon400" size="default" />
                      </div>
                      <div>
                        <Title variant="h5" tag="p" class="font-medium" data-field-path="advantageTitle">
                          {props.payload.advantageTitle ?? 'Les avantages'}
                        </Title>
                      </div>
                    </div>

                    <Show when={props.payload.advantagePoints?.length}>
                      <div class="space-y-2 rounded-2xl p-4">
                        <For each={props.payload.advantagePoints}>
                          {(p) => <CheckListItem text={p} />}
                        </For>
                      </div>
                    </Show>
                    <Show when={props.payload.advantageText}>
                      <Text data-field-path="advantageText">{props.payload.advantageText}</Text>
                    </Show>
                  </div>
                </Card>
              </div>
            </Show>

            <Show when={(props.payload.children?.length ?? 0) > 0 && props.renderChild}>
              <div class="space-y-6" data-field-path="children" data-field-rail="children">
                <For each={props.payload.children ?? []}>
                  {(child) => props.renderChild!(child)}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </AfterHeroContainerWide>
  );
};
