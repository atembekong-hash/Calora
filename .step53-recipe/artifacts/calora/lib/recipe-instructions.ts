const COOKING_VERB = /\b(heat|add|mix|stir|cook|bake|fry|boil|simmer|combine|place|pour|remove|chop|slice|dice|season|drain|cover|bring|reduce|serve|transfer|whisk|fold|toss|coat|set aside|prepare|rinse|soak|wash|cut|peel|grate|melt|spray|preheat|marinate|roast|saut[eé]|blend|spread|roll|knead|rest|cool|refrigerate|strain|squeeze|brush|garnish|flip|grease|line|wrap|seal|break|separate|beat|cream|form|shape|drop|spoon|finish|top)\b/i;

const FILLER_PREFIX = /^(Now[,.]?\s+|Next[,.]?\s+|Then[,.]?\s+|After that[,.]?\s+|Once done[,.]?\s+|At this point[,.]?\s+|Finally[,.]?\s+|First of all[,.]?\s+|Lastly[,.]?\s+|Go ahead and\s+|Make sure to\s+|Be sure to\s+|You should\s+|You can\s+)/i;

function cleanStep(step: string): string {
  return step
    .replace(/[*_`#]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[.,:;\s]+/, '')
    .trim();
}

function splitParagraphActions(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  if (sentences.length < 2) return [text];

  const actions = sentences.map(cleanStep).filter((sentence) => sentence.length > 4);
  return actions.length > 1 && actions.every((action) => COOKING_VERB.test(action))
    ? actions
    : [text];
}

/**
 * Turns upstream recipe text into display-ready cooking actions without adding
 * information that the source did not provide. Short, complete methods remain
 * short; the character count is exposed only for quality reporting.
 */
export function parseRecipeInstructionSteps(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];

  let text = raw
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[ \t]*[*\-•][ \t]*/gm, '')
    .replace(/\r\n?/g, '\n');

  const numbered = text.split(/(?:^|\n)\s*(?:step\s+)?\d+[.):\s]+/i);
  let steps = numbered.length >= 3
    ? numbered.map((step) => step.trim()).filter(Boolean)
    : text.split('\n').map((step) => step.trim()).filter(Boolean);

  if (steps.length < 2) steps = splitParagraphActions(text.trim());

  const firstCookingStep = steps.findIndex((step) => COOKING_VERB.test(step));
  if (firstCookingStep > 0) steps = steps.slice(firstCookingStep);

  steps = steps
    .map((step) => cleanStep(step.replace(FILLER_PREFIX, '')))
    .filter((step) => step.length > 4);

  if (steps.length > 0) return steps;

  const fallback = cleanStep(raw);
  return fallback.length > 4 && /[a-z0-9]/i.test(fallback) ? [fallback] : [];
}

export function getRecipeMethodCharacterCount(raw: string | null | undefined): number {
  return parseRecipeInstructionSteps(raw).join(' ').length;
}