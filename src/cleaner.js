import { readFileSync } from 'node:fs';

const MAX_REDIRECT_DEPTH = 5;

// Rule files use the ClearURLs format: https://docs.clearurls.xyz/latest/specs/rules/
function compileProvider(raw) {
  const paramRules = [...(raw.rules ?? []), ...(raw.referralMarketing ?? [])];
  return {
    urlPattern: new RegExp(raw.urlPattern, 'i'),
    // completeProvider marks pure tracking endpoints; there is nothing to clean.
    skip: raw.completeProvider === true,
    exceptions: (raw.exceptions ?? []).map((r) => new RegExp(r, 'i')),
    redirections: (raw.redirections ?? []).map((r) => new RegExp(r, 'i')),
    rawRules: (raw.rawRules ?? []).map((r) => new RegExp(r, 'gi')),
    param: paramRules.length ? new RegExp(`^(?:${paramRules.join('|')})$`, 'i') : null,
  };
}

function stripFields(fields, param) {
  return fields
    .split('&')
    .filter((field) => !param.test(field.split('=')[0]))
    .join('&');
}

// Works on the raw string so untouched parameters keep their order and encoding.
function stripParams(url, param) {
  const hashAt = url.indexOf('#');
  let fragment = hashAt === -1 ? null : url.slice(hashAt + 1);
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);

  const queryAt = beforeHash.indexOf('?');
  let query = queryAt === -1 ? null : beforeHash.slice(queryAt + 1);
  const base = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);

  if (query !== null) query = stripFields(query, param);
  if (fragment?.includes('=')) fragment = stripFields(fragment, param);

  return base + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');
}

function redirectTarget(url, provider) {
  for (const redirection of provider.redirections) {
    const encoded = redirection.exec(url)?.[1];
    if (!encoded) continue;
    try {
      const target = decodeURIComponent(encoded);
      if (/^https?:\/\//i.test(target)) return target;
    } catch {
      // Malformed escape sequence: leave the URL as it is.
    }
  }
  return null;
}

export function createCleaner(ruleSets) {
  const providers = ruleSets.flatMap((set) => Object.values(set.providers).map(compileProvider));

  function clean(url, depth = 0) {
    for (const provider of providers) {
      if (provider.skip || !provider.urlPattern.test(url)) continue;
      if (provider.exceptions.some((exception) => exception.test(url))) continue;

      const target = depth < MAX_REDIRECT_DEPTH ? redirectTarget(url, provider) : null;
      if (target) return clean(target, depth + 1);

      for (const rawRule of provider.rawRules) url = url.replace(rawRule, '');
      if (provider.param) url = stripParams(url, provider.param);
    }
    return url;
  }

  return clean;
}

function loadRules(name) {
  return JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
}

export const cleanUrl = createCleaner([loadRules('clearurls.json'), loadRules('extra.json')]);
