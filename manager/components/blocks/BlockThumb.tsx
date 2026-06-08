import type { ContentBlock } from '@shared/content-schema';

import { BLOCK_TYPE_GLYPHS } from '@/lib/blockDefaults';
import { cn } from '@/lib/utils';

/**
 * Small violet gradient square stamped with a single-character glyph
 * (cf. `BLOCK_TYPE_GLYPHS`) — Direction C's row affordance for
 * "what type is this block". Replaces the previous flat uppercase
 * badge ("HERO (TITRE)" / "TEXTE" / …) which read as a label rather
 * than as an icon.
 *
 * Two sizes :
 *   - `default` (34 px) : root rows in the chapter editor — needs
 *     to compete with the chapter title typography for visual weight.
 *   - `nested` (26 px) : sub-block rows — smaller so the nesting
 *     hierarchy reads at a glance.
 *
 * The gradient is a fixed violet-to-deep-violet diagonal, deliberately
 * hand-crafted in inline `style` rather than mapped to a Tailwind
 * utility — it's the ONLY surface in the manager that uses this
 * exact gradient, so the inline keeps the design contract local.
 */
export function BlockThumb({
  type,
  size = 'default',
  className,
}: {
  type: ContentBlock['type'];
  size?: 'default' | 'nested';
  className?: string;
}) {
  const glyph = BLOCK_TYPE_GLYPHS[type] ?? '·';
  const isNested = size === 'nested';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold text-white',
        isNested ? 'h-7 w-7 rounded-[8px] text-[13px]' : 'h-9 w-9 rounded-[10px] text-[15px]',
        className,
      )}
      style={{
        background: isNested
          ? 'linear-gradient(135deg, #7d5bd6 0%, #5a2bb0 100%)'
          : 'linear-gradient(135deg, #9951fb 0%, #6e1ed2 100%)',
        boxShadow: isNested ? '0 2px 8px -3px rgba(130, 46, 239, 0.55)' : '0 4px 14px -6px rgba(130, 46, 239, 0.7)',
      }}
      aria-hidden="true"
      title={`Bloc « ${type} »`}
    >
      {glyph}
    </span>
  );
}
