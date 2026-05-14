import type {
  BranchingCondition,
  ContentBlock,
  FAQQuestionContent,
} from '@shared/content-schema';
import { isAllCondition, isAnyCondition, isLeafCondition } from '@shared/content-schema';

/**
 * Walk a tree of blocks (recursing into card.children, conditional then/else
 * and faqCard question conditionals) and return the set of variable keys
 * referenced by any branching condition.
 */
export function extractUsedVariableKeys(blocks: ContentBlock[] | undefined | null): Set<string> {
  const out = new Set<string>();
  if (!blocks) return out;
  for (const b of blocks) walkBlock(b, out);
  return out;
}

function walkBlock(block: ContentBlock, out: Set<string>): void {
  switch (block.type) {
    case 'conditional':
      walkCondition(block.payload.condition, out);
      for (const c of block.payload.then) walkBlock(c, out);
      for (const c of block.payload.else ?? []) walkBlock(c, out);
      return;
    case 'card':
      for (const c of block.payload.children) walkBlock(c, out);
      return;
    case 'faqCard':
      for (const q of block.payload.questions) {
        for (const item of q.blocks) walkFaqContent(item, out);
      }
      return;
    default:
      return;
  }
}

function walkFaqContent(item: FAQQuestionContent, out: Set<string>): void {
  if (item.kind !== 'conditional') return;
  walkCondition(item.condition, out);
  for (const c of item.then) walkFaqContent(c, out);
  for (const c of item.else ?? []) walkFaqContent(c, out);
}

function walkCondition(c: BranchingCondition, out: Set<string>): void {
  if (isLeafCondition(c)) {
    out.add(c.variable);
    return;
  }
  if (isAllCondition(c)) {
    for (const sub of c.all) walkCondition(sub, out);
    return;
  }
  if (isAnyCondition(c)) {
    for (const sub of c.any) walkCondition(sub, out);
  }
}
