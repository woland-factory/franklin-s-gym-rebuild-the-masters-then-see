// Counts words in a string by splitting on whitespace. Used for seed-library
// band validation and its tests.
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function totalWordCount(sentences: string[]): number {
  return sentences.reduce((sum, sentence) => sum + wordCount(sentence), 0);
}
