// Mentions are stored inline in the message body as `@[Display Name](userId)`
// — a stable, unambiguous markup (won't collide with two people sharing a
// first name, unlike matching on "@Name" text alone) that the composer
// inserts when a user is picked from the suggestion dropdown, and that
// rendering below turns back into a highlighted chip.
const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

export interface BodySegment {
  type: "text" | "mention";
  text: string;
  userId?: string;
}

export function parseMentionMarkup(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let lastIndex = 0;
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const [full, name, userId] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ type: "text", text: body.slice(lastIndex, index) });
    segments.push({ type: "mention", text: name, userId });
    lastIndex = index + full.length;
  }
  if (lastIndex < body.length) segments.push({ type: "text", text: body.slice(lastIndex) });
  return segments;
}

export function mentionMarkup(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}
