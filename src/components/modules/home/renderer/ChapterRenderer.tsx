/* eslint-disable solid/no-innerhtml */
import type {
  Chapter,
  ContentBlock,
  FAQQuestionContent,
  KeyPointsCardBlock,
  ToolContentSectionBlock,
  KeyPointsGroupItem,
} from '@shared/content-schema';
import { evaluateCondition } from '@shared/content-schema';

import { CheckListGroup } from '../../../organisms/CheckListGroup';
import { Component, createMemo, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js';

import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { CheckListItem } from '../../../molecules/CheckListItem';
import { AudioPlayer } from '../../../primitives/AudioPlayer';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { AfterHeroContainer, AfterHeroContainerFullVideoSection } from '../components/AfterHeroContainer';
import { ChapterTransitionGrid } from '../components/ChapterTransitionGrid';
import { ExceptionBlock } from '../components/ExceptionBlock';
import { FAQCard } from '../components/FAQCard';
import { HeroTitle } from '../components/Hero';
import { KeyPointsCard } from '../components/KeyPointsCard';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { ToolContentSection } from '../components/ToolContentSection';
import { useHome } from '../context/HomeContext';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';
import { CUSTOM_COMPONENT_RUNTIME } from './customComponents';
import { RenderFormBlock } from './RenderFormBlock';

// ============================================================
// Pilot-specific Tool 1 navbar
// ============================================================
// Lifted from HomeTool1.tsx so the renderer stays self-contained.
// Will be generalised once we extract per-chapter chrome into the schema.

/**
 * Resolves a block's `payload.navbar.variant` key against the parcours'
 * navbar variants registry (loaded into HomeContext at mount) and renders
 * a title + optional icon/percent ring + accent color background.
 *
 * Legacy fallback: when a key is referenced but not registered (e.g.
 * `appointment` / `contact` on a parcours that hasn't been seeded), the
 * key itself is displayed and a console warning is emitted so the author
 * notices the gap in the manager.
 */
const Tool1Navbar: Component<{ variantKey: string }> = (props) => {
  const { navbarVariants } = useHome();
  const variant = createMemo(() =>
    navbarVariants().find((v) => v.key === props.variantKey),
  );
  return (
    <div class="sticky left-0 top-0 z-50 w-full">
      <div
        class="flex w-full items-center justify-between px-8 py-4 shadow"
        style={{
          background: variant()?.color
            ? `linear-gradient(176deg, ${variant()!.color}33 0%, ${variant()!.color}1a 96.48%)`
            : 'linear-gradient(176deg, rgba(255, 255, 255, 0.66) 0%, rgba(255, 255, 255, 0.33) 96.48%)',
        }}
      >
        <div class="flex items-center gap-3">
          <Show when={variant()?.icon}>
            <Icon
              icon={`icon icon-${variant()!.icon} h-6 w-6`}
              variant="primary400"
              size="default"
            />
          </Show>
          <Title variant="h4">
            {variant()?.title ?? props.variantKey}
          </Title>
        </div>
        <Show when={typeof variant()?.percent === 'number'}>
          <div class="flex items-center gap-2">
            <i
              class={`icon bg-circle-${variant()!.percent}-percent block h-14 w-[100px]`}
            />
          </div>
        </Show>
      </div>
    </div>
  );
};

const renderNavbar = (navbar?: { variant: string }): JSX.Element | undefined =>
  navbar?.variant ? <Tool1Navbar variantKey={navbar.variant} /> : undefined;

/**
 * Convert raw newlines into `<br>` so author-typed carriage returns appear
 * in the rendered output. Skips newlines already adjacent to a closing
 * HTML tag (e.g. between `</p>` and `<p>`) to avoid double spacing in
 * already-structured HTML.
 */
const nl2br = (html: string | undefined): string =>
  (html ?? '').replace(/(?<!>)\n/g, '<br>');

// ============================================================
// Block dispatcher
// ============================================================

interface BlockProps {
  block: ContentBlock;
  sectionProps: HOME_SECTION_PROPS;
  /**
   * True when this block is rendered as a CHILD of another container block
   * (card, conditional inside a card, etc.). Containers signal nesting so
   * leaf blocks can opt out of their own outer wrappers (e.g. keyPointsCard
   * renders inline instead of wrapping itself in AfterHeroContainer + Card,
   * which would otherwise create nested cards visible as visually separate
   * blocks).
   */
  nested?: boolean;
}

const RenderBlock: Component<BlockProps> = (props) => {
  const { data } = useHome();

  const block = () => props.block;

  return (
    <Show when={block()}>
      {(b) => {
        const blk = b();
        switch (blk.type) {
          case 'heroTitle':
            return (
              <HeroTitle title={blk.payload.title} number={blk.payload.number} sectionTitle={blk.payload.sectionTitle}>
                <Show when={blk.payload.illustration}>
                  {/* Square vignette with a pronounced -4° tilt, rounded
                       corners and soft shadow. `aspect-square` forces a 1:1
                       ratio so any source image is cropped to a uniform
                       thumbnail. Positioned in the upper-right area (not
                       bottom-anchored) and capped at 480px so it doesn't
                       dominate the hero. No hover animation (the image
                       should sit still). */}
                  <img
                    src={blk.payload.illustration!}
                    class="right-0 top-1/4 aspect-square w-full -rotate-[4deg] rounded-2xl object-cover shadow-md md:absolute md:max-w-[480px]"
                    alt="header"
                  />
                </Show>
              </HeroTitle>
            );

          case 'video':
            return (
              <AfterHeroContainerFullVideoSection
                contentClass={
                  blk.payload.contentClass ?? 'h-[calc(100dvh-144px)] md:!h-[calc(100dvh-88px)]'
                }
                contentId={blk.payload.contentId}
                src={blk.payload.vimeoSrc}
              >
                {renderNavbar(blk.payload.navbar)}
              </AfterHeroContainerFullVideoSection>
            );

          case 'text':
            return (
              <AfterHeroContainer contentClass="">
                <Text variant={blk.payload.variant}>
                  <span innerHTML={nl2br(blk.payload.html)} />
                </Text>
              </AfterHeroContainer>
            );

          case 'keyPointsCard':
            return <RenderKeyPoints block={blk} nested={props.nested} />;

          case 'toolContentSection':
            return <RenderToolContentSection block={blk} sectionProps={props.sectionProps} />;

          case 'faqCard':
            return (
              <AfterHeroContainer contentClass="max-w-[680px]" preChildren={renderNavbar(blk.payload.navbar)}>
                <div data-field-rail="questions" data-field-path="questions">
                  <FAQCard
                    questions={blk.payload.questions
                      .map((q) => ({
                        title: q.title,
                        content: <RenderFaqContent blocks={q.blocks} />,
                      }))
                      .filter(Boolean)}
                  />
                </div>
              </AfterHeroContainer>
            );

          case 'card':
            return (
              <AfterHeroContainer contentClass="" preChildren={renderNavbar(blk.payload.navbar)}>
                <Card>
                  {/* Optional cover image — same visual treatment as the
                       chapter transition card (rounded, full-bleed inside the
                       card chrome). A subtle 2° tilt + soft shadow gives it a
                       "casually placed photo" look, mirroring the playful
                       slight rotation visible on the reference design.
                       The outer wrapper has matching padding so the rotated
                       corners don't get clipped by the card edges. */}
                  <Show when={blk.payload.image}>
                    <div class="mb-6 px-2 py-3">
                      <img
                        src={blk.payload.image!}
                        alt={blk.payload.imageAlt ?? ''}
                        class="block w-full -rotate-2 rounded-2xl object-cover shadow-md transition-transform duration-300 ease-out hover:rotate-0"
                      />
                    </div>
                  </Show>
                  <div data-field-rail="children" data-field-path="children" class="space-y-6">
                    <For each={blk.payload.children}>
                      {(child) => (
                        <RenderBlock block={child} sectionProps={props.sectionProps} nested />
                      )}
                    </For>
                  </div>
                </Card>
              </AfterHeroContainer>
            );

          case 'conditional':
            return (
              <For
                each={
                  evaluateCondition(blk.payload.condition, data() ?? {})
                    ? blk.payload.then
                    : blk.payload.else ?? []
                }
              >
                {(child) => (
                  <RenderBlock
                    block={child}
                    sectionProps={props.sectionProps}
                    nested={props.nested}
                  />
                )}
              </For>
            );

          case 'componentRef': {
            const Comp = CUSTOM_COMPONENT_RUNTIME[blk.payload.name];
            if (!Comp) {
              // eslint-disable-next-line no-console
              console.warn('[ChapterRenderer] unknown custom component:', blk.payload.name);
              return null;
            }
            // Spread sectionProps first, then payload.props so authored
            // overrides win over the framework defaults.
            return <Comp {...props.sectionProps} {...(blk.payload.props ?? {})} />;
          }

          case 'form':
            return (
              <div data-field-rail="fields" data-field-path="fields">
                <RenderFormBlock block={blk} sectionProps={props.sectionProps} />
              </div>
            );

          case 'photoCarousel':
            return (
              <div data-field-rail="photos" data-field-path="photos">
                <PhotoCarousel payload={blk.payload} />
              </div>
            );

          // Legacy block type `chapterTransition` removed from the schema.
          // Any row still carrying that type in DB hits the `default` branch
          // below (returns null silently) — no manual rendering needed.

          default:
            return null;
        }
      }}
    </Show>
  );
};

// ============================================================
// keyPointsCard sub-renderer (with optional ExceptionBlock)
// ============================================================

const iconForKey = (key?: string, variant: 'primary' | 'white' = 'primary') => {
  if (!key) return null;
  return (
    <Icon
      icon={`icon icon-${key} !h-3 !w-3`}
      variant={variant === 'primary' ? 'primary400' : 'whitePrimary400'}
      size="xs"
    />
  );
};

const resolveGroupItems = (items: KeyPointsGroupItem[], vars: Record<string, unknown>) => {
  const out: string[] = [];
  for (const it of items) {
    if ('conditional' in it) {
      const ok = evaluateCondition(it.conditional, vars);
      if (ok) out.push(it.then.text);
      else if (it.else) out.push(it.else.text);
    } else {
      out.push(it.text);
    }
  }
  return out;
};

const RenderToolContentSection: Component<{
  block: ToolContentSectionBlock;
  sectionProps: HOME_SECTION_PROPS;
}> = (props) => {
  const { data } = useHome();
  return (
    <ToolContentSection
      payload={props.block.payload}
      personWhoHandleCalls={data()?.personWhoHandleCalls as string | undefined}
      renderChild={(child) => <RenderBlock block={child} sectionProps={props.sectionProps} />}
    />
  );
};

const RenderKeyPoints: Component<{ block: KeyPointsCardBlock; nested?: boolean }> = (props) => {
  const { data } = useHome();
  // `inline` skips the outer AfterHeroContainer + Card wrapper so the
  // content blends into the parent container. Triggered by either an
  // explicit `payload.inline === true` flag (legacy) OR by the parent
  // signalling that this block is nested inside another container (card,
  // conditional inside a card, etc.). Without this, a keyPointsCard inside
  // a `card` would render as a visually separate card — exactly the "split
  // in two" bug we're fixing.
  const inline = () => props.block.payload.inline === true || props.nested === true;
  // Header + main items are always rendered (when present). Groups + exception
  // are ADDITIVE — both can appear in the same card. Historically the renderer
  // showed `exception` OR `groups` (XOR), but the prod content combines main
  // header + groups (with variants like dark/peach) + an overlapping
  // exception sticker, all in a single keyPointsCard block.
  const mainHeader = (
    <>
      <Show when={props.block.payload.main.title}>
        <div class="flex items-center gap-2">
          <div>{iconForKey(props.block.payload.main.icon)}</div>
          <div>
            <Title variant="h5" tag="p" class="font-medium text-dark-950">
              {props.block.payload.main.title}
            </Title>
          </div>
        </div>
      </Show>
      <Show when={props.block.payload.main.description}>
        <Text>
          <span innerHTML={nl2br(props.block.payload.main.description)} />
        </Text>
      </Show>
      <For each={props.block.payload.main.extraDescriptions ?? []}>
        {(d) => (
          <Text fontWeight="medium" class="leading-tight" variant="sm">
            <span innerHTML={nl2br(d)} />
          </Text>
        )}
      </For>
      <For each={props.block.payload.main.items ?? []}>
        {(item) => <CheckListItem variant="success400" text={item.text} />}
      </For>
    </>
  );

  // The exception sticker (purple, slightly rotated) is positioned to
  // overlap the previous element from below. In prod content it sits
  // between the FIRST group (e.g. the dark "En cas d'absence" section)
  // and the second group (peach "Si votre secrétaire"). When no groups
  // exist, it overlaps the `main` block instead.
  const exceptionSticker = () => {
    if (!props.block.payload.exception) return null;
    return (
      <div
        data-field-rail="exception"
        data-field-path="exception"
        class="-mt-10 mx-2 -rotate-2 w-[calc(100%-1rem)] space-y-2 rounded-2xl bg-primary-400 p-4 text-white"
      >
        <div class="flex items-center gap-2">
          <div>{iconForKey(props.block.payload.exception!.icon, 'white')}</div>
          <div>
            <Title variant="h5" tag="p">
              {props.block.payload.exception!.title}
            </Title>
          </div>
        </div>
        <Show when={props.block.payload.exception!.description}>
          <Text class="text-white">{props.block.payload.exception!.description}</Text>
        </Show>
        <For each={props.block.payload.exception!.items ?? []}>
          {(item) => <CheckListItem variant="whiteSuccess400" text={item.text} />}
        </For>
      </div>
    );
  };

  // Render groups, inserting the exception sticker after the FIRST group so
  // it visually attaches/overlaps that group's bottom edge. The remaining
  // groups follow below.
  const groupsWithSticker = (
    <For each={props.block.payload.groups ?? []}>
      {(group, idx) => (
        <>
          <CheckListGroup
            title={group.title}
            text={resolveGroupItems(group.items, (data() ?? {}) as Record<string, unknown>)}
            variant={group.variant ?? 'secondary50'}
          />
          <Show when={idx() === 0}>{exceptionSticker()}</Show>
        </>
      )}
    </For>
  );

  // Fallback: no groups → exception (if any) hangs off the main block.
  const exceptionWithoutGroups = (
    <Show when={(props.block.payload.groups ?? []).length === 0}>
      {exceptionSticker()}
    </Show>
  );

  // Each section is wrapped in a [data-field-rail] div so the manager can
  // draw matching coloured bars in the gutter beside the preview. The keys
  // mirror the editor's Section accentColors :
  //   - "subtitle" (rose)  → main.icon/title/description/items/extraDescriptions
  //   - "groups"   (amber) → groups[]
  //   - "exception"(violet)→ exception sticker (handled inside exceptionSticker)
  const hasGroups = () => (props.block.payload.groups ?? []).length > 0;
  // Inner content WITHOUT any Card / KeyPointsCard wrapper — used when nested
  // (the parent card already provides the visual frame) so we don't end up
  // with nested cards visible as visually-separate boxes.
  const bareInner = (
    <div class="space-y-4">
      <div data-field-rail="subtitle" data-field-path="main" class="space-y-2">
        {mainHeader}
      </div>
      <Show when={hasGroups()}>
        <div data-field-rail="groups" data-field-path="groups" class="space-y-4">
          {groupsWithSticker}
        </div>
      </Show>
      {exceptionWithoutGroups}
    </div>
  );
  const cardInner = (
    <KeyPointsCard hideHeader={props.block.payload.hideHeader}>
      {bareInner}
    </KeyPointsCard>
  );

  return (
    <Show
      when={inline()}
      fallback={
        <AfterHeroContainer
          contentClass={props.block.payload.contentClass ?? ''}
          preChildren={renderNavbar(props.block.payload.navbar)}
        >
          {cardInner}
        </AfterHeroContainer>
      }
    >
      {/* Nested / inline mode : the parent container (card, conditional inside
          card, etc.) already supplies the outer Card frame. Render the bare
          content so we don't double-wrap and produce two visually-separate
          cards. */}
      <div class={props.block.payload.contentClass ?? ''}>
        {bareInner}
      </div>
    </Show>
  );
};

// ============================================================
// FAQ content sub-renderer
// ============================================================

const RenderFaqContent: Component<{ blocks: FAQQuestionContent[] }> = (props) => {
  const { data } = useHome();
  return (
    <div class="space-y-2">
      <For each={props.blocks}>
        {(b) => {
          switch (b.kind) {
            case 'text':
              return (
                <Text class="text-dark-950 opacity-[66%]">
                  <span innerHTML={nl2br(b.html)} />
                </Text>
              );
            case 'list':
              return (
                <For each={b.items}>
                  {(item) => <CheckListItem variant="success400TextOpacity66" text={item.text} />}
                </For>
              );
            case 'audio':
              return <AudioPlayer url={b.url} />;
            case 'callout':
              return (
                <div class="flex items-start gap-2 rounded-lg bg-primary-50 px-2 py-1">
                  <div class="pt-1">
                    <i class="brand icon-brand-icon block size-5 bg-primary-400" />
                  </div>
                  <div>
                    <Text class="text-primary-400">
                      <span innerHTML={nl2br(b.html)} />
                    </Text>
                  </div>
                </div>
              );
            case 'conditional':
              return (
                <RenderFaqContent
                  blocks={evaluateCondition(b.condition, data() ?? {}) ? b.then : b.else ?? []}
                />
              );
            default:
              return null;
          }
        }}
      </For>
    </div>
  );
};

// ============================================================
// Public entry point
// ============================================================

export const ChapterRenderer: Component<{
  chapter: Chapter;
  sectionProps: HOME_SECTION_PROPS;
}> = (props) => {
  // Live block-payload overrides pushed from the manager block editor.
  // Maps block id → ContentBlock that replaces the DB-loaded block at render time.
  const [overrides, setOverrides] = createSignal<Record<string, ContentBlock>>({});

  onMount(() => {
    if (typeof window === 'undefined') return;

    function handler(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return;

      switch (e.data.type) {
        case 'preview:scrollToBlock': {
          const blockId = String(e.data.blockId ?? '');
          if (!blockId) return;
          // Retry for up to ~2s: the block element may not be in the DOM
          // yet if the chapter just remounted (new variables → re-evaluated
          // conditions → new children mounting). We also use `instant`
          // because the parcours scroller has `scroll-snap-type: mandatory`
          // which silently cancels smooth scrolls in Chrome.
          let attempts = 0;
          const tryScroll = () => {
            const el = document.getElementById(`block-${blockId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
              return;
            }
            if (attempts++ < 20) setTimeout(tryScroll, 100);
          };
          tryScroll();
          return;
        }
        case 'preview:setBlockOverride': {
          const blockId = String(e.data.blockId ?? '');
          const block = e.data.block as ContentBlock | undefined;
          if (!blockId || !block) return;
          setOverrides((prev) => ({ ...prev, [blockId]: block }));
          return;
        }
        case 'preview:clearBlockOverride': {
          const blockId = String(e.data.blockId ?? '');
          if (!blockId) return;
          setOverrides((prev) => {
            const { [blockId]: _, ...rest } = prev;
            return rest;
          });
          return;
        }
        case 'preview:highlightField': {
          // Editor → preview: highlight the [data-field-path=…] element
          // inside [data-block-id=…]. Sending fieldPath = null/empty clears
          // any existing highlight.
          const blockId = String(e.data.blockId ?? '');
          const fieldPath = e.data.fieldPath ? String(e.data.fieldPath) : null;
          document
            .querySelectorAll('.mfm-field-highlight')
            .forEach((el) => el.classList.remove('mfm-field-highlight'));
          if (!blockId || !fieldPath) return;
          const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
          if (!blockEl) return;
          const target = blockEl.querySelector(`[data-field-path="${fieldPath}"]`);
          target?.classList.add('mfm-field-highlight');
          return;
        }
        case 'preview:setEditedBlock': {
          // Editor → preview: persistent outline around the block currently
          // being edited in the manager. Sending null/empty clears the
          // outline (e.g. when the user navigates away from a block).
          const blockId = e.data.blockId ? String(e.data.blockId) : null;
          document
            .querySelectorAll('.mfm-block-editing')
            .forEach((el) => el.classList.remove('mfm-block-editing'));
          if (!blockId) {
            currentEditingBlockId = null;
            sendRails([]);
            return;
          }
          const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
          blockEl?.classList.add('mfm-block-editing');
          currentEditingBlockId = blockId;
          // Recompute on next frame so layout has settled. Also schedule
          // a couple of retries because the block may not be in the DOM
          // yet (the chapter is still rendering its blocks asynchronously).
          requestAnimationFrame(measureRails);
          setTimeout(measureRails, 250);
          setTimeout(measureRails, 1000);
          return;
        }
      }
    }

    // -- Field rails ---------------------------------------------------
    // Measure y-position + height of each `[data-field-rail]` inside the
    // currently-edited block and post them to the parent so it can draw a
    // matching coloured bar in the gutter beside the preview iframe.
    let currentEditingBlockId: string | null = null;
    let lastRailsPayload = '';
    let rafScheduled = false;

    function sendRails(rails: Array<{ key: string; top: number; height: number }>) {
      if (!window.parent || window.parent === window) return;
      const payload = JSON.stringify(rails);
      if (payload === lastRailsPayload) return;
      lastRailsPayload = payload;
      window.parent.postMessage(
        { type: 'preview:fieldRails', blockId: currentEditingBlockId, rails },
        '*',
      );
    }

    function measureRails() {
      rafScheduled = false;
      if (!currentEditingBlockId) {
        sendRails([]);
        return;
      }
      const blockEl = document.querySelector(`[data-block-id="${currentEditingBlockId}"]`);
      if (!blockEl) {
        sendRails([]);
        return;
      }
      const railEls = blockEl.querySelectorAll<HTMLElement>('[data-field-rail]');
      const rails: Array<{ key: string; top: number; height: number }> = [];
      railEls.forEach((el) => {
        const key = el.getAttribute('data-field-rail');
        if (!key) return;
        const rect = el.getBoundingClientRect();
        rails.push({ key, top: rect.top, height: rect.height });
      });
      sendRails(rails);
    }

    function scheduleMeasure() {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(measureRails);
    }

    const railsResizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null;
    if (railsResizeObserver) railsResizeObserver.observe(document.body);
    // Listen for scroll events on the iframe window AND on any nested
    // scrollable container (capture phase). The chapter content can be
    // scrolled by an inner element rather than `window` (e.g. some sections
    // are wrapped in a fixed-height div), and in that case `window.scroll`
    // never fires — leaving the rail positions stale.
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    document.addEventListener('scroll', scheduleMeasure, { passive: true, capture: true });
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    // While a block is being edited, also re-measure on a low-frequency timer
    // as a safety net for any layout shift we didn't anticipate (image load,
    // font swap, video metadata, async lazy children…).
    const railsSafetyTimer = window.setInterval(() => {
      if (currentEditingBlockId) scheduleMeasure();
    }, 400);

    // Inject the highlight CSS once. Doing it from JS avoids touching the
    // SCSS pipeline and keeps the rule scoped to a single, well-named class.
    if (!document.getElementById('mfm-field-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'mfm-field-highlight-style';
      style.textContent = `
.mfm-field-highlight{outline:3px solid rgb(251 191 36 / 0.9);outline-offset:4px;border-radius:8px;transition:outline 120ms ease-out;}
.mfm-block-editing{
  outline:4px solid rgb(251 191 36 / 1);
  outline-offset:10px;
  border-radius:16px;
  box-shadow:
    0 0 0 10px rgb(251 191 36 / 0.25),
    0 0 0 18px rgb(251 191 36 / 0.14),
    0 0 0 30px rgb(251 191 36 / 0.06),
    0 0 40px 8px rgb(251 191 36 / 0.35);
  animation: mfm-edit-pulse 2.2s ease-in-out infinite;
}
@keyframes mfm-edit-pulse {
  0%,100%{box-shadow:0 0 0 10px rgb(251 191 36 / 0.25),0 0 0 18px rgb(251 191 36 / 0.14),0 0 0 30px rgb(251 191 36 / 0.06),0 0 40px 8px rgb(251 191 36 / 0.35);}
  50%{box-shadow:0 0 0 10px rgb(251 191 36 / 0.4),0 0 0 22px rgb(251 191 36 / 0.22),0 0 0 38px rgb(251 191 36 / 0.10),0 0 60px 12px rgb(251 191 36 / 0.5);}
}
      `;
      document.head.appendChild(style);
    }

    window.addEventListener('message', handler);

    // Handshake: signal to the parent (manager iframe host) that our
    // listener is installed and we're ready to receive `setEditedBlock` /
    // `setBlockOverride` / `highlightField`. Without this, the parent may
    // send messages on `iframe.onLoad` before Solid mounted and the very
    // first push gets lost.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'preview:rendererReady' }, '*');
    }

    onCleanup(() => {
      window.removeEventListener('message', handler);
      window.removeEventListener('scroll', scheduleMeasure);
      document.removeEventListener('scroll', scheduleMeasure, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', scheduleMeasure);
      window.clearInterval(railsSafetyTimer);
      railsResizeObserver?.disconnect();
    });
  });

  // Track which block is currently the topmost visible in the iframe and
  // notify the manager parent so it can highlight the matching row.
  onMount(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    let lastReported: string | null = null;
    const intersectingTops = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.blockId;
          if (!id) continue;
          if (entry.isIntersecting) {
            intersectingTops.set(id, entry.boundingClientRect.top);
          } else {
            intersectingTops.delete(id);
          }
        }

        // Pick the block whose top is closest to viewport top (= "current").
        let best: { id: string; score: number } | null = null;
        for (const [id, top] of intersectingTops) {
          const score = Math.abs(top);
          if (!best || score < best.score) best = { id, score };
        }

        if (best && best.id !== lastReported) {
          lastReported = best.id;
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(
              { type: 'preview:visibleBlock', blockId: best.id },
              '*',
            );
          }
        }
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    // Wait one tick so the For loop has rendered the wrapper divs.
    const timer = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
        observer.observe(el);
      });
    }, 100);

    // Click-to-inspect: when running inside the manager preview iframe,
    // intercept clicks on rendered blocks and notify the parent so it can
    // scroll the corresponding row in the block list. We DO NOT prevent
    // the default action — links / form inputs keep working normally — we
    // just emit a passive postMessage. Outside the preview iframe (live
    // public app) the listener is never installed.
    const inPreview =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('preview') === '1';
    let clickHandler: ((e: MouseEvent) => void) | null = null;
    if (inPreview && window.parent && window.parent !== window) {
      clickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const wrapper = target.closest<HTMLElement>('[data-block-id]');
        if (!wrapper) return;
        const blockId = wrapper.getAttribute('data-block-id');
        const blockType = wrapper.getAttribute('data-block-type');
        if (!blockId) return;
        window.parent.postMessage(
          { type: 'preview:blockClicked', blockId, blockType },
          '*',
        );
      };
      document.addEventListener('click', clickHandler, true);

      // Affordance: hover effect on every [data-block-id] so the user
      // discovers that blocks are clickable in the preview. Scoped to
      // preview-mode via a dedicated <style> tag (live public app is
      // untouched). The currently-edited block keeps its own ambar
      // outline and is excluded from the indigo hover.
      if (!document.getElementById('mfm-preview-clickable-style')) {
        const previewStyle = document.createElement('style');
        previewStyle.id = 'mfm-preview-clickable-style';
        previewStyle.textContent = `
[data-block-id]{cursor:pointer;}
[data-block-id]:hover:not(.mfm-block-editing){
  outline:2px dashed rgb(99 102 241 / 0.45);
  outline-offset:4px;
  border-radius:8px;
  transition:outline 100ms ease-out;
}
        `;
        document.head.appendChild(previewStyle);
      }
    }

    onCleanup(() => {
      clearTimeout(timer);
      observer.disconnect();
      if (clickHandler) document.removeEventListener('click', clickHandler, true);
    });
  });

  return (
    <div class={props.chapter.wrapperClass ?? undefined}>
      {/* Optional hero image at the very top of the chapter — same image as
           the chapter card in the section panorama, displayed full-width with
           rounded corners. Skipped if `chapter.cardImage` is empty.
           Capped at 40vh so portrait / large images don't dominate the page
           and bury the chapter content + transition grid below the fold. */}
      <Show when={props.chapter.cardImage}>
        <div class="mb-8 px-4 md:px-8">
          <img
            src={props.chapter.cardImage!}
            alt={props.chapter.cardShortTitle ?? props.chapter.title}
            class="mx-auto block max-h-[40vh] w-full max-w-4xl rounded-2xl object-cover shadow-sm"
          />
        </div>
      </Show>
      <For each={props.chapter.blocks}>
        {(originalBlock) => {
          // Memo recomputes when an override for this block id is added/cleared.
          const effective = createMemo<ContentBlock>(
            () => overrides()[originalBlock.id] ?? originalBlock,
          );
          return (
            <div
              id={`block-${originalBlock.id}`}
              data-block-id={originalBlock.id}
              data-block-type={originalBlock.type}
            >
              {/* keyed Show remounts RenderBlock when the effective block reference changes */}
              <Show keyed when={effective()}>
                {(b) => <RenderBlock block={b} sectionProps={props.sectionProps} />}
              </Show>
            </div>
          );
        }}
      </For>
      {/* Auto-injected "next chapter" section panorama at the end of every
          chapter (custom parcours only — demo-ventes legacy keeps its
          hardcoded GoToNextPartButton). Renders the next chapter's section
          with the next chapter highlighted + a "Découvrir" CTA. The
          ChapterTransitionGrid itself returns null when there is no next
          chapter, so the last chapter of the parcours stays clean. */}
      <ChapterTransitionGrid activeChapter="next" />
    </div>
  );
};
