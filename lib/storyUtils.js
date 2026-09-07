export function storyTextFromPages(pages = []) {
  return pages.map((page) => page.text).join(' ');
}

export function countWords(text = '') {
  return text.split(/\s+/).filter(Boolean).length;
}

export function sortThemes(themes = []) {
  return [...themes].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return (a.order || 0) - (b.order || 0);
  });
}
