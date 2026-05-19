/** Pretty-print a (possibly nested) BranchingCondition for the block list. */
function summarizeCondition(c: Record<string, unknown>): string {
  if (Array.isArray((c as { all?: unknown[] }).all)) {
    return ((c as { all: Record<string, unknown>[] }).all)
      .map(summarizeCondition)
      .join(' ET ');
  }
  if (Array.isArray((c as { any?: unknown[] }).any)) {
    return ((c as { any: Record<string, unknown>[] }).any)
      .map(summarizeCondition)
      .join(' OU ');
  }
  const variable = c.variable;
  const op = c.op;
  const value = c.value;
  if (typeof variable !== 'string') return JSON.stringify(c);
  return `${variable} ${op} ${JSON.stringify(value)}`;
}

/** Produce a short human-readable summary for a block row. */
export function summarizeBlock(type: string, payload: Record<string, unknown>): string {
  try {
    switch (type) {
      case 'heroTitle':
        return String((payload.title as string) ?? '');
      case 'video': {
        // Don't expose the raw URL (vimeo/<id>?hash=... or
        // https://...supabase.../<file>.mp4) — it's long, noisy and not
        // useful in a list. Surface a friendly label instead, with a
        // shortened ID/filename for orientation.
        const src = String((payload.vimeoSrc as string) ?? '').trim();
        if (!src) return '(aucune source)';
        if (src.startsWith('vimeo/')) {
          const id = src.slice('vimeo/'.length).split('?')[0];
          return id ? `Vimeo · ${id}` : 'Vimeo';
        }
        if (src.startsWith('http://') || src.startsWith('https://')) {
          // Extract the last segment of the URL path as a "filename" hint.
          // For supabase storage URLs that's `<timestamp>-<slug>.<ext>`,
          // for external URLs it's whatever the user pasted.
          const tail = src.split('/').pop() ?? '';
          const cleaned = tail.split('?')[0] || 'fichier';
          return `Fichier vidéo · ${cleaned}`;
        }
        return 'Vidéo';
      }
      case 'text': {
        // Strip HTML tags, decode common entities, collapse whitespace then
        // truncate to 80 chars. The previous order (slice → strip) could
        // leave a half-open <tag in the visible text.
        const html = String(payload.html ?? '');
        const stripped = html
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
        return stripped.length > 80 ? `${stripped.slice(0, 80)}…` : stripped;
      }
      case 'keyPointsCard': {
        const main = payload.main as { title?: string } | undefined;
        return main?.title ?? '(bloc clés)';
      }
      case 'faqCard': {
        const qs = (payload.questions as unknown[]) ?? [];
        return `${qs.length} question(s)`;
      }
      case 'card': {
        const children = (payload.children as unknown[]) ?? [];
        const hasImage = typeof payload.image === 'string' && payload.image !== '';
        return `${hasImage ? 'avec image — ' : ''}${children.length} bloc(s) enfant(s)`;
      }
      case 'conditional': {
        const cond = payload.condition as Record<string, unknown> | undefined;
        if (!cond) return 'condition';
        return summarizeCondition(cond);
      }
      case 'componentRef':
        return String(payload.name ?? '');
      case 'toolContentSection':
        // `name` is deprecated (legacy label nav) — fall back to the title
        // when missing, which is now the source of truth for the section
        // identity.
        return String(payload.title ?? payload.name ?? '');
      default:
        return JSON.stringify(payload).slice(0, 80);
    }
  } catch {
    return '(payload invalide)';
  }
}
