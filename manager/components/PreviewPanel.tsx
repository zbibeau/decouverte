'use client';

import { ExternalLink, Pencil, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Variable {
  id: string;
  key: string;
  label: string;
  type: 'boolean' | 'enum' | 'string' | 'number';
  options: Array<{ value: string; label: string }>;
}

interface BlockOverride {
  blockId: string;
  block: { type: string; payload: Record<string, unknown> };
}

interface Props {
  chapterSlug: string;
  /**
   * Slug of the parcours being previewed. When provided, the iframe URL uses
   * the dedicated route `/parcours/<slug>/...` so the Solid renderer loads
   * the right parcours. Omit (or pass the legacy default) to keep the
   * historical `/` URL for backward-compat with the demo-ventes parcours.
   */
  parcoursSlug?: string;
  variables: Variable[];
  clientUrl?: string;
  /** When set/changed, the iframe scrolls to the matching `#block-{id}` anchor via postMessage. */
  selectedBlockId?: string | null;
  /**
   * Live block override pushed to the renderer via postMessage. Used by the
   * block editor to preview unsaved changes. The PreviewPanel debounces the
   * outbound messages so we don't spam on every keystroke.
   */
  blockOverride?: BlockOverride | null;
  /**
   * Called when the visible block in the iframe changes (user scrolls inside
   * the preview). The Solid app notifies via postMessage.
   */
  onVisibleBlock?: (blockId: string) => void;
  /**
   * Called when the user clicks on a block in the iframe (click-to-inspect).
   * Different from `onVisibleBlock` which fires passively on scroll — here
   * we know the user explicitly pointed at a block.
   */
  onBlockClicked?: (blockId: string, blockType?: string) => void;
  /**
   * Called when the user clicks the floating « Éditer ce bloc » CTA — opens the
   * editor of the block currently at the top of the preview viewport. When
   * omitted, that CTA is hidden (e.g. the single-block editor page).
   */
  onEditVisibleBlock?: (blockId: string) => void;
  /** Previous / next chapter (by parcours order) for the « ← / → Chapitre »
   *  nav pills. Omit a side when there's no adjacent chapter. */
  prevChapter?: { slug: string; title: string };
  nextChapter?: { slug: string; title: string };
  /** Open a chapter for editing (the pills call this with the target slug).
   *  When omitted, the chapter-nav pills are hidden (e.g. single-block page). */
  onGoToChapter?: (slug: string) => void;
  /**
   * JSON path of the field currently being hovered/focused in the editor.
   * When set, the iframe gets a `preview:highlightField` postMessage so the
   * corresponding `[data-field-path]` element lights up. Sending `null`
   * clears the highlight.
   */
  hoveredField?: string | null;
  /** Block id used as the scope for `hoveredField`. Required if hoveredField is set. */
  hoveredFieldBlockId?: string;
  /**
   * Block currently being edited in the manager. Drives the persistent
   * dashed outline rendered around that block in the preview iframe so the
   * user always knows where their changes will apply.
   */
  editingBlockId?: string | null;
  /**
   * When the edited block is scrolled out of the iframe viewport, this prop
   * tells the floating "revenir" banner which direction to point to.
   *   - 'above'  → banner at the top, "↑ Revenir"
   *   - 'below'  → banner at the bottom, "↓ Revenir"
   *   - null     → banner hidden (block is visible)
   */
  editedBlockOffscreen?: 'above' | 'below' | null;
  /** Short summary of the edited block, shown inside the offscreen banner. */
  editedBlockSummary?: string;
  /**
   * Field-rail positions emitted by the Solid renderer for the currently-
   * edited block. Each rail is drawn as a coloured vertical bar at the
   * left edge of the preview iframe, aligned with the corresponding
   * rendered region (titre / vidéo / avantages / sous-blocs…).
   */
  fieldRails?: Array<{ key: string; top: number; height: number }>;
  /** Called when the iframe re-emits rail positions (on scroll/resize). */
  onFieldRails?: (rails: Array<{ key: string; top: number; height: number }>) => void;
  /** Map rail key → CSS colour. Required if `fieldRails` is set. */
  fieldRailColors?: Record<string, string>;
  /**
   * "chapter" (default) loads the full chapter from Supabase and previews the
   * block in context. "isolatedBlock" renders only the single block being
   * created — used by the block creation flow so the user focuses on what
   * they're building.
   */
  mode?: 'chapter' | 'isolatedBlock';
  isolatedBlockType?: string;
  /**
   * When set, the iframe URL will include `?version=<versionId>` so the Solid
   * renderer loads that specific parcours_version (typically the draft being
   * edited). Without it, the client falls back to the published version.
   */
  versionId?: string | null;
  /**
   * When set alongside `versionId`, a toggle appears in the header letting
   * the user switch the iframe between the draft (`versionId`) and the
   * published version. Passing only `versionId` (no publishedVersionId) hides
   * the toggle — we only render the draft.
   */
  publishedVersionId?: string | null;
  /**
   * Controlled-state hooks for the variable simulator. When the parent
   * passes `values` + `onValuesChange`, the simulator becomes a fully
   * controlled component — useful when an external widget (e.g. the inline
   * `ConditionSimulator` inside `ConditionalEditor`) needs to read or
   * mutate the same values. When omitted, the panel falls back to its own
   * internal state for back-compat with simpler callers.
   */
  values?: Record<string, string>;
  onValuesChange?: (next: Record<string, string>) => void;
  /**
   * Parent-controlled reload trigger. When its number changes, the iframe
   * URL gets a fresh nonce → iframe remounts → Solid front re-fetches data.
   * Used by `ChapterEditor` after inserting a new block, so the preview
   * actually sees the freshly-created block instead of its stale snapshot.
   * Add to the **internal** reload counter so the toolbar's "Recharger"
   * button still works on top of external reloads.
   */
  reloadKey?: number;
}

export function PreviewPanel({
  chapterSlug,
  parcoursSlug,
  variables,
  clientUrl = 'http://localhost:3100',
  selectedBlockId,
  blockOverride,
  onVisibleBlock,
  onBlockClicked,
  onEditVisibleBlock,
  prevChapter,
  nextChapter,
  onGoToChapter,
  hoveredField,
  hoveredFieldBlockId,
  editingBlockId,
  editedBlockOffscreen,
  editedBlockSummary,
  fieldRails,
  onFieldRails,
  fieldRailColors,
  mode = 'chapter',
  isolatedBlockType,
  versionId,
  publishedVersionId,
  values: controlledValues,
  onValuesChange,
  reloadKey,
}: Props) {
  // Which version the iframe is currently displaying. Default to the draft
  // when available; the toggle (rendered below when both ids are provided)
  // lets the user flip to the published version for side-by-side comparison.
  const [previewTarget, setPreviewTarget] = useState<'draft' | 'published'>(versionId ? 'draft' : 'published');
  // Reset the toggle state if the draft appears/disappears.
  useEffect(() => {
    setPreviewTarget(versionId ? 'draft' : 'published');
  }, [versionId]);
  // State: current value per variable (string form, parsed later).
  // When the parent supplies controlled `values` + `onValuesChange`, those
  // win and the internal state is unused — but we still declare it so the
  // hook order stays stable across renders.
  const [internalValues, setInternalValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of variables) {
      if (v.type === 'boolean') initial[v.key] = 'false';
      else if (v.type === 'enum') initial[v.key] = v.options[0]?.value ?? '';
      else initial[v.key] = '';
    }
    return initial;
  });
  const values = controlledValues ?? internalValues;
  // Unified setter that accepts either a new object or an updater fn,
  // and dispatches to the controlled callback OR the internal setState.
  const setValues = (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    if (onValuesChange) {
      const next = typeof updater === 'function' ? updater(values) : updater;
      onValuesChange(next);
    } else {
      setInternalValues(updater);
    }
  };

  // Nonce used to force iframe reload when user clicks refresh.
  const [nonce, setNonce] = useState(0);
  // Final value baked into the iframe URL — combines the internal counter
  // (toolbar "Recharger") with the parent-controlled `reloadKey` so both
  // sources independently bump the URL and remount the iframe.
  const effectiveNonce = nonce + (reloadKey ?? 0);

  // Iframe ref + loaded flag — used to defer postMessage until the Solid app
  // has installed its message listener.
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  // True once the Solid `<ChapterRenderer>` has mounted INSIDE the iframe
  // and posted `preview:rendererReady`. We need this signal to gate the
  // edit-mode messages (`setEditedBlock`, `highlightField`) — sending them
  // before Solid mounts loses them.
  const [rendererReady, setRendererReady] = useState(false);
  // Topmost block currently visible in the iframe (reported by the renderer on
  // scroll). Drives the floating « Éditer ce bloc » CTA.
  const [visibleBlockId, setVisibleBlockId] = useState<string | null>(null);
  // Chapter the preview is actually SHOWING (reported by the front). Diverges
  // from `chapterSlug` (the chapter the manager edits) when the editor
  // navigates inside the preview via a transition panorama → the edit pill then
  // switches the edited chapter to match.
  const [previewChapterSlug, setPreviewChapterSlug] = useState<string | null>(null);

  // Stable identity inputs for the URL — using the override's blockId+type
  // (not the full object) keeps the URL stable on every keystroke so the
  // iframe doesn't reload while the user is editing.
  const overrideBlockId = blockOverride?.blockId ?? null;
  const overrideBlockType = blockOverride?.block.type ?? null;

  const iframeUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('preview', '1');
    if (mode === 'isolatedBlock' && overrideBlockId) {
      // Standalone isolated route — the renderer mounts a single placeholder
      // block matching `id` + `type`; the live override comes via postMessage.
      params.set('id', overrideBlockId);
      params.set('type', isolatedBlockType ?? overrideBlockType ?? 'text');
      for (const [key, value] of Object.entries(values)) {
        if (value !== '') params.set(key, value);
      }
      params.set('_n', String(effectiveNonce));
      return `${clientUrl}/preview-block?${params.toString()}`;
    }
    params.set('step', chapterSlug);
    // Which version the iframe loads depends on the toggle:
    //   - 'draft' → &version=<draftId>   (if the draft exists)
    //   - 'published' → pass the explicit publishedVersionId if we know it,
    //     otherwise omit the param and let loadChapter fall back to
    //     parcours.published_version_id.
    const targetVersion = previewTarget === 'draft' ? versionId : (publishedVersionId ?? null);
    if (targetVersion) params.set('version', targetVersion);
    for (const [key, value] of Object.entries(values)) {
      if (value !== '') params.set(key, value);
    }
    params.set('_n', String(effectiveNonce));
    // Route differs per parcours: the legacy `demo-ventes` parcours lives at
    // `/`; every other slug uses the dynamic `/parcours/<slug>` route. If no
    // slug is passed we default to `/` for back-compat.
    const path =
      parcoursSlug && parcoursSlug !== 'demo-ventes' ? `/parcours/${encodeURIComponent(parcoursSlug)}/` : '/';
    return `${clientUrl}${path}?${params.toString()}`;
  }, [
    chapterSlug,
    parcoursSlug,
    values,
    clientUrl,
    effectiveNonce,
    mode,
    overrideBlockId,
    overrideBlockType,
    isolatedBlockType,
    versionId,
    publishedVersionId,
    previewTarget,
  ]);

  // Reset ready flag whenever the iframe is remounted (URL or nonce changed).
  useEffect(() => {
    setIframeReady(false);
    setRendererReady(false);
    setPreviewChapterSlug(null);
  }, [iframeUrl]);

  // Listen for the `preview:rendererReady` handshake from the Solid side.
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'preview:rendererReady') setRendererReady(true);
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Whenever iframeReady flips (new iframe load) OR selectedBlockId changes,
  // (re)send the scroll request. Re-sending after a reload is important:
  // changing a variable in the simulator reloads the iframe, which would
  // otherwise reset the scroll position to the top.
  useEffect(() => {
    if (!iframeReady || !selectedBlockId) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    // Small initial delay so the renderer has mounted its blocks; the Solid
    // side also retries internally for up to ~2s if the element is not in
    // the DOM yet (e.g. conditional branch just evaluated).
    const t = setTimeout(() => {
      win.postMessage({ type: 'preview:scrollToBlock', blockId: selectedBlockId }, clientUrl);
    }, 400);
    return () => clearTimeout(t);
  }, [iframeReady, selectedBlockId, clientUrl]);

  // Listen for messages coming back from the iframe (visible block on scroll
  // + click-to-inspect on user click + field rails on edit-mode).
  useEffect(() => {
    if (!onVisibleBlock && !onBlockClicked && !onFieldRails && !onEditVisibleBlock) return;
    function handler(e: MessageEvent) {
      // Only accept messages from our own iframe.
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'preview:visibleBlock' && typeof e.data.blockId === 'string') {
        setVisibleBlockId(e.data.blockId);
        onVisibleBlock?.(e.data.blockId);
      }
      if (e.data.type === 'preview:chapterChanged' && typeof e.data.chapterSlug === 'string') {
        setPreviewChapterSlug(e.data.chapterSlug);
      }
      if (e.data.type === 'preview:blockClicked' && typeof e.data.blockId === 'string' && onBlockClicked) {
        onBlockClicked(e.data.blockId, e.data.blockType);
      }
      if (e.data.type === 'preview:fieldRails' && Array.isArray(e.data.rails) && onFieldRails) {
        onFieldRails(e.data.rails);
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onVisibleBlock, onBlockClicked, onFieldRails, onEditVisibleBlock]);

  // Push live block override to the iframe whenever the editor state changes.
  // Debounced 200ms so we don't spam on every keystroke.
  useEffect(() => {
    if (!iframeReady || !rendererReady || !blockOverride) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const t = setTimeout(() => {
      win.postMessage(
        {
          type: 'preview:setBlockOverride',
          blockId: blockOverride.blockId,
          block: blockOverride.block,
        },
        clientUrl,
      );
    }, 200);
    return () => clearTimeout(t);
  }, [iframeReady, rendererReady, blockOverride, clientUrl]);

  // Persistent outline around the block currently being edited. Sent once
  // each time `editingBlockId` changes (or the iframe reloads). The Solid
  // side keeps the outline until we send a clear (blockId = null). Gated
  // on `rendererReady` to avoid losing the message before Solid mounted.
  useEffect(() => {
    if (!iframeReady || !rendererReady) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'preview:setEditedBlock', blockId: editingBlockId ?? null }, clientUrl);
  }, [iframeReady, rendererReady, editingBlockId, clientUrl]);

  // Push hovered field path so the iframe lights up the corresponding
  // [data-field-path] element. Lightly debounced (40ms) to avoid flicker
  // when the mouse moves rapidly across adjacent fields.
  useEffect(() => {
    if (!iframeReady || !rendererReady) return;
    const win = iframeRef.current?.contentWindow;
    if (!win || !hoveredFieldBlockId) return;
    const t = setTimeout(() => {
      win.postMessage(
        {
          type: 'preview:highlightField',
          blockId: hoveredFieldBlockId,
          fieldPath: hoveredField ?? null,
        },
        clientUrl,
      );
    }, 40);
    return () => clearTimeout(t);
  }, [iframeReady, rendererReady, hoveredField, hoveredFieldBlockId, clientUrl]);

  // Toggle is only meaningful when we know both versions and we're in chapter
  // (not isolatedBlock) mode — the single-block preview is version-agnostic.
  const showVersionToggle = mode === 'chapter' && Boolean(versionId) && Boolean(publishedVersionId);

  // When a block is being edited AND that block is actually visible in the
  // preview, give the whole panel an ambar halo — a reinforcement of "this
  // is what you're editing right now". When the block is scrolled offscreen,
  // we suppress the halo because the floating banner already takes the
  // attention (no need to double up).
  const editingActive = Boolean(editingBlockId) && !editedBlockOffscreen;

  // Floating navigation cluster (bottom-right of the iframe) :
  //   - « Éditer ce bloc » → open the editor of the block currently in view
  //     (only when the host wired `onEditVisibleBlock`, and it's not already
  //     the block being edited).
  //   - « ↑/↓ Revenir » → scroll the preview back to the block being edited
  //     when it has been scrolled offscreen (replaces the old full-width banner).
  const showEditVisible = Boolean(onEditVisibleBlock && visibleBlockId && visibleBlockId !== editingBlockId);
  const showReturnToEdited = Boolean(editingBlockId && editedBlockOffscreen);
  //   - « ← / → Chapitre » → open the previous / next chapter for editing
  //     (router.push), so the editor can hop chapters straight from the preview.
  const showChapterNav = Boolean(onGoToChapter && (prevChapter || nextChapter));
  //   - When the preview has navigated to a DIFFERENT chapter than the one being
  //     edited (via a transition panorama), the « Éditer ce bloc » pill becomes
  //     « Éditer ce chapitre » → switches the edited chapter to match.
  const previewOnOtherChapter = Boolean(onGoToChapter && previewChapterSlug && previewChapterSlug !== chapterSlug);

  return (
    <div
      className={
        editingActive
          ? // Mode édition active : halo amber autour du panneau pour matérialiser
            // « on regarde la chose en train d'être éditée ». Garde la même
            // structure que le mode neutre, juste un anneau coloré en plus.
            'rounded-app border-app bg-surface sticky top-4 flex h-[calc(100vh-2rem)] flex-col gap-3 border-2 border-amber-300 p-3 shadow-[0_0_0_4px_rgba(251,191,36,0.18),0_0_30px_4px_rgba(251,191,36,0.25)] dark:border-amber-700/60'
          : 'rounded-app border-border shadow-app bg-surface sticky top-4 flex h-[calc(100vh-2rem)] flex-col gap-3 border p-3'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-text text-sm font-semibold">Preview</h3>
        <div className="flex items-center gap-1">
          {showVersionToggle && (
            // Segmented brouillon/publié — ambre pour brouillon, émeraude
            // pour publié. Conteneur surface-2 (cohérent avec les onglets
            // pill), pilule active dans la couleur de l'état.
            <div className="bg-surface-2 rounded-app-sm mr-1 inline-flex gap-0.5 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewTarget('draft')}
                className={
                  previewTarget === 'draft'
                    ? 'shadow-app-sm rounded-[6px] bg-amber-100 px-2 py-1 font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                    : 'text-text-muted hover:text-text rounded-[6px] px-2 py-1 transition-colors'
                }
                title="Afficher le brouillon"
              >
                Brouillon
              </button>
              <button
                type="button"
                onClick={() => setPreviewTarget('published')}
                className={
                  previewTarget === 'published'
                    ? 'shadow-app-sm rounded-[6px] bg-emerald-100 px-2 py-1 font-medium text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
                    : 'text-text-muted hover:text-text rounded-[6px] px-2 py-1 transition-colors'
                }
                title="Afficher la version publiée (live)"
              >
                Publié
              </button>
            </div>
          )}
          <Button variant="ghost" size="sm" title="Recharger" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <a href={iframeUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" title="Ouvrir dans un onglet">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Note: parent already filters `variables` down to those actually
          referenced by the previewed content; if the list is empty we hide
          the simulator entirely. */}
      {variables.length > 0 && (
        <div className="border-border bg-muted/30 space-y-1 rounded-md border px-2 py-1.5">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Simulateur de variables
          </p>
          <div className="divide-border/60 divide-y">
            {variables.map((v) => (
              <VariableControl
                key={v.id}
                variable={v}
                value={values[v.key] ?? ''}
                onChange={(newValue) => setValues((prev) => ({ ...prev, [v.key]: newValue }))}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-border rounded-app-sm relative flex-1 overflow-hidden border bg-[#08070b]">
        <iframe
          key={iframeUrl}
          ref={iframeRef}
          src={iframeUrl}
          className="h-full w-full"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="autoplay; fullscreen; picture-in-picture"
          onLoad={() => setIframeReady(true)}
        />
        {/* Field rails — coloured vertical bars at the left edge of the
            iframe area, aligned with the rendered regions of the edited
            block. The Solid side emits positions on every scroll/resize;
            we draw them with absolute positioning in iframe-viewport
            coordinates. Visible only when a block is being edited AND
            currently in the viewport (`editingActive` already gates the
            halo around the panel for the same reason). */}
        {editingActive && fieldRails && fieldRails.length > 0 && fieldRailColors && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10" style={{ width: 10 }}>
            {fieldRails.map((r, i) => {
              const color = fieldRailColors[r.key];
              if (!color) return null;
              // Clip to the iframe height so a partially-offscreen region
              // shows as a partial bar. Index appended to the React key so
              // multiple rails with the same `r.key` (e.g. nested cards,
              // each emitting `data-field-rail="children"`) don't trigger
              // React's duplicate-key warning.
              return (
                <div
                  key={`${r.key}-${i}`}
                  style={{
                    position: 'absolute',
                    left: 2,
                    top: Math.max(r.top, 0),
                    height: Math.max(r.height + Math.min(r.top, 0), 0),
                    width: 4,
                    background: color,
                    borderRadius: 4,
                    transition: 'top 120ms ease-out, height 120ms ease-out',
                  }}
                />
              );
            })}
          </div>
        )}
        {/* Floating navigation cluster (bottom-right): jump to the editor of the
            block in view, and/or scroll the preview back to the block being
            edited when it's offscreen. Stacks vertically when both apply. */}
        {(showEditVisible || showReturnToEdited || showChapterNav || previewOnOtherChapter) && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
            {previewOnOtherChapter ? (
              <button
                type="button"
                onClick={() => onGoToChapter?.(previewChapterSlug!)}
                className="bg-brand-primary-600 hover:bg-brand-primary-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-md transition"
                title="Éditer le chapitre actuellement affiché dans la preview"
              >
                <Pencil className="h-3.5 w-3.5" />
                Éditer ce chapitre
              </button>
            ) : showEditVisible ? (
              <button
                type="button"
                onClick={() => onEditVisibleBlock?.(visibleBlockId!)}
                className="bg-brand-primary-600 hover:bg-brand-primary-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-md transition"
                title="Éditer ce bloc dans le panneau de gauche"
              >
                <Pencil className="h-3.5 w-3.5" />
                Éditer ce bloc
              </button>
            ) : null}
            {showReturnToEdited && (
              <button
                type="button"
                onClick={() => {
                  const win = iframeRef.current?.contentWindow;
                  win?.postMessage({ type: 'preview:scrollToBlock', blockId: editingBlockId }, clientUrl);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-md transition hover:bg-violet-700"
                title={
                  editedBlockSummary ? `Revenir à « ${editedBlockSummary} »` : "Revenir au bloc en cours d'édition"
                }
              >
                <span className="text-sm leading-none">{editedBlockOffscreen === 'above' ? '↑' : '↓'}</span>
                Revenir
              </button>
            )}
            {showChapterNav && (
              <div className="flex items-center gap-1.5">
                {prevChapter && onGoToChapter && (
                  <button
                    type="button"
                    onClick={() => onGoToChapter(prevChapter.slug)}
                    className="border-border text-foreground bg-surface/95 hover:bg-surface inline-flex max-w-[150px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-md transition"
                    title={`Éditer le chapitre précédent : ${prevChapter.title}`}
                  >
                    <span className="leading-none">←</span>
                    <span className="truncate">{prevChapter.title}</span>
                  </button>
                )}
                {nextChapter && onGoToChapter && (
                  <button
                    type="button"
                    onClick={() => onGoToChapter(nextChapter.slug)}
                    className="border-border text-foreground bg-surface/95 hover:bg-surface inline-flex max-w-[150px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-md transition"
                    title={`Éditer le chapitre suivant : ${nextChapter.title}`}
                  >
                    <span className="truncate">{nextChapter.title}</span>
                    <span className="leading-none">→</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-[10px]">
        L&apos;iframe pointe vers <code>{clientUrl}</code>. Le mode preview bypasse localStorage et Hubspot — les
        valeurs ci-dessus sont injectées via l&apos;URL.
      </p>
    </div>
  );
}

function VariableControl({
  variable,
  value,
  onChange,
}: {
  variable: Variable;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <code className="text-muted-foreground truncate text-[11px] font-medium" title={variable.label}>
        {variable.key}
      </code>
      <div className="shrink-0">
        {variable.type === 'boolean' ? (
          <Switch checked={value === 'true'} onChange={(v) => onChange(v ? 'true' : 'false')} />
        ) : variable.type === 'enum' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-border bg-surface text-text h-7 max-w-[180px] rounded-md border px-2 text-xs"
          >
            {variable.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 max-w-[140px] text-xs"
            type={variable.type === 'number' ? 'number' : 'text'}
          />
        )}
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ' +
        (checked ? 'bg-primary' : 'bg-muted-foreground/30')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-[18px]' : 'translate-x-0.5')
        }
      />
    </button>
  );
}
