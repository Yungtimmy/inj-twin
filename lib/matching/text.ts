export type Token = {
  lemma: string;
  surface: string;
  /** Index in the original word list, so bigrams stay inside a phrase. */
  position: number;
};

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while', 'of', 'to', 'in', 'on',
  'for', 'from', 'with', 'at', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it',
  'its', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'he', 'she', 'them', 'our',
  'your', 'my', 'me', 'us', 'not', 'no', 'yes', 'do', 'does', 'did', 'doing', 'done', 'have', 'has',
  'had', 'having', 'just', 'so', 'than', 'too', 'very', 'can', 'could', 'should', 'would', 'will',
  'about', 'into', 'over', 'after', 'before', 'up', 'down', 'out', 'off', 'again', 'further', 'once',
  'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'what', 'which', 'who', 'whom', 'why', 'how', 'because', 'until', 'during',
  'above', 'below', 'between', 'through', 'under', 'also', 'still', 'already', 'really', 'like',
  'im', 'dont', 'didnt', 'cant', 'wont', 'via', 'amp', 'rt', 'http', 'https', 'www', 'com', 'co',
  're', 've', 'll', 'their', 'ours', 'yours', 'itself', 'something', 'someone', 'thing', 'things',
  'way', 'ways', 'time', 'times', 'day', 'days', 'week', 'weekly', 'month', 'year', 'new', 'old',
  'good', 'best', 'better', 'well', 'even', 'much', 'many', 'lot', 'lots', 'another', 'today',
  'yesterday', 'tomorrow', 'latest', 'update', 'number', 'first', 'whole', 'part', 'keep', 'keeps',
  'back', 'look', 'looks', 'looked', 'watch', 'watches', 'watched', 'watching', 'just', 'got', 'get',
  'make', 'made', 'take', 'took', 'come', 'came', 'going', 'gonna', 'actually', 'live', 'report',
  'design', 'cleared', 'slice', 'worth', 'tracking', 'again', 'still', 'here', 'there', 'into',
  'onto', 'per', 'off', 'our', 'was', 'but', 'its', 'been', 'being', 'than', 'then', 'them', 'they',
  'this', 'that', 'with', 'from', 'your', 'have', 'what', 'when', 'where', 'which', 'would', 'could',
  'should', 'about',   'because', 'while', 'once', 'after', 'before', 'again', 'also', 'very', 'really',
  'much', 'more', 'most', 'some', 'only', 'other', 'such', 'into', 'over', 'under', 'again',
  'now', 'next', 'people', 'soon', 'hey', 'lol', 'yeah', 'folks', 'please', 'thanks', 'thank',
]);

/** Price, hype, and trading words. They never become traits. */
export const PRICE_TERMS = new Set([
  'price', 'prices', 'priced', 'pricing', 'pump', 'pumped', 'pumping', 'moon', 'mooning', 'moonshot',
  'target', 'targets', 'entry', 'entries', 'ath', 'dip', 'dips', 'bullish', 'bearish', 'long',
  'short', 'longs', 'shorts', 'leverage', 'leveraged', 'buy', 'sell', 'bought', 'sold', 'pnl',
  'profit', 'profits', 'liquidation', 'liquidated', 'candle', 'candles', 'chart', 'charts',
  'resistance', 'support', 'bag', 'bags', 'wagmi', 'ngmi', 'dump', 'dumped', 'rekt', 'ape', 'aped',
  'fomo', 'rally', 'bullrun', 'roi', 'gains', 'gain', 'invest', 'investment', 'investing',
  'financial', 'advice', 'bottom', 'top', 'tops', 'call', 'calls', 'x100',
]);

/** Everyone in this app is already posting about Injective, so the name alone is not a trait. */
export const DOMAIN_STOP = new Set(['inj', 'injective', 'injs']);

export function stem(token: string): string {
  if (
    token.length > 3 &&
    token.endsWith('s') &&
    !token.endsWith('ss') &&
    !token.endsWith('us') &&
    !token.endsWith('is') &&
    !token.endsWith('ics')
  ) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenize(text: string): Token[] {
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/\bt\.co\/\S+/gi, ' ')
    .replace(/\$[a-zA-Z][a-zA-Z0-9_]*/g, ' ')
    .replace(/@[a-zA-Z0-9_]+/g, ' ')
    .replace(/#([a-zA-Z0-9_]+)/g, ' $1 ');

  const raw = cleaned.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  const tokens: Token[] = [];
  raw.forEach((surface, position) => {
    if (surface !== 'inj' && surface.length < 3) return;
    if (/\d/.test(surface)) return;
    if (STOPWORDS.has(surface) || PRICE_TERMS.has(surface)) return;
    const lemma = stem(surface);
    if (STOPWORDS.has(lemma) || PRICE_TERMS.has(lemma)) return;
    tokens.push({ lemma, surface, position });
  });
  return tokens;
}

export function prettyToken(lemma: string, surface: string): string {
  if (lemma === 'inj' || surface === 'inj') return 'INJ';
  if (lemma === 'injective' || surface === 'injective') return 'Injective';
  return surface;
}
