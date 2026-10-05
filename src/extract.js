const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const URL = /https?:\/\/[^\s<>]+/gi;
const TRAILING_PUNCTUATION = /[.,!?:;'"*_~|]+$/;

function count(text, char) {
  return text.split(char).length - 1;
}

// Drops punctuation that belongs to the surrounding sentence or markdown, not the link.
function trimTrailing(url) {
  for (;;) {
    const trimmed = url.replace(TRAILING_PUNCTUATION, '');
    if (trimmed.endsWith(')') && count(trimmed, ')') > count(trimmed, '(')) {
      url = trimmed.slice(0, -1);
    } else if (trimmed === url) {
      return url;
    } else {
      url = trimmed;
    }
  }
}

// Returns the distinct http(s) URLs in a message, ignoring anything inside code.
export function extractUrls(content) {
  const text = content.replace(CODE, ' ');
  const urls = (text.match(URL) ?? []).map(trimTrailing);
  return [...new Set(urls)];
}
