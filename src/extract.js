const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const CODE_SPLIT = new RegExp(`(${CODE.source})`);
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

// Rewrites every http(s) URL outside code with replace(url); the rest of the message is untouched.
export function replaceUrls(content, replace) {
  return content
    .split(CODE_SPLIT)
    .map((part, index) => {
      if (index % 2) return part;
      return part.replace(URL, (match) => {
        const url = trimTrailing(match);
        return replace(url) + match.slice(url.length);
      });
    })
    .join('');
}
