/** Opens the X compose box. The app never posts on anyone's behalf. */
export function xIntentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function pairShareText(input: {
  twinHandle: string;
  similarity: number;
  why: string;
  url: string;
}): string {
  const why = input.why.replace(/\.$/, '');
  return `My INJ twin is @${input.twinHandle} (${input.similarity}%). ${why}.\n${input.url}`;
}

export function waitingShareText(url: string): string {
  return `Waiting for my INJ twin, the person who posts about Injective like I do.\n${url}`;
}

export function ogWhy(phrase: string): string {
  return phrase.replace(/^Both of you post about\s+/i, 'Both post about ');
}
