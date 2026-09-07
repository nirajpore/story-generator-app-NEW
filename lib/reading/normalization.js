export function normalizeWord(word = '') {
  return word
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/(^[^a-z0-9']+|[^a-z0-9']+$)/gi, '')
    .trim();
}

export function tokenizeForAlignment(text = '') {
  return text
    .split(/\s+/)
    .map((token) => normalizeWord(token))
    .filter(Boolean);
}

export function normalizeTextForDisplay(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}
