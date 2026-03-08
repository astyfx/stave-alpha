const PROPOSED_PLAN_OPEN = "<proposed_plan>";
const PROPOSED_PLAN_CLOSE = "</proposed_plan>";

export function startsWithProposedPlan(args: { text: string }) {
  return args.text.trimStart().startsWith(PROPOSED_PLAN_OPEN);
}

export function extractProposedPlanText(args: { text: string }) {
  const trimmed = args.text.trim();
  if (!trimmed.startsWith(PROPOSED_PLAN_OPEN)) {
    return null;
  }

  const closeIndex = trimmed.lastIndexOf(PROPOSED_PLAN_CLOSE);
  if (closeIndex === -1) {
    return null;
  }

  const trailing = trimmed.slice(closeIndex + PROPOSED_PLAN_CLOSE.length).trim();
  if (trailing.length > 0) {
    return null;
  }

  return trimmed.slice(PROPOSED_PLAN_OPEN.length, closeIndex).trim();
}
