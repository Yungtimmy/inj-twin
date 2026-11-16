/** Recent search is about a 7-day window. Retweets are excluded; replies and quotes stay. */
export function recentSearchQuery(handle: string): string {
  return `from:${handle} (injective OR @injective OR $INJ OR #injective) -is:retweet`;
}
