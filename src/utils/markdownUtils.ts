export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const generateTableOfContents = (markdown: string): TocItem[] => {
  const lines = markdown.split('\n');
  const toc: TocItem[] = [];
  
  for (const line of lines) {
    // Match markdown headings (## Heading, ### Heading, etc.)
    const match = line.match(/^(#{2,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      toc.push({ id, text, level });
    }
  }
  
  return toc;
};

export const addTocToMarkdown = (markdown: string, toc: TocItem[]): string => {
  if (toc.length === 0) return markdown;
  
  let tocMarkdown = '## Table of Contents\n\n';
  
  for (const item of toc) {
    const indent = '  '.repeat(item.level - 2);
    tocMarkdown += `${indent}- [${item.text}](#${item.id})\n`;
  }
  
  tocMarkdown += '\n---\n\n';
  
  // Insert TOC after the first heading
  const firstHeadingIndex = markdown.indexOf('\n\n');
  if (firstHeadingIndex !== -1) {
    return markdown.slice(0, firstHeadingIndex + 2) + tocMarkdown + markdown.slice(firstHeadingIndex + 2);
  }
  
  return tocMarkdown + markdown;
};

export const addAnchorsToMarkdown = (markdown: string): string => {
  return markdown.replace(/^(#{2,6})\s+(.+)$/gm, (match, hashes, text) => {
    const id = text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    return `${hashes} ${text} {#${id}}`;
  });
};
