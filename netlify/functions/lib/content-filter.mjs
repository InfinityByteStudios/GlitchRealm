// Advanced content filter for GlitchRealm reviews (server-side).
//
// Layers:
//   1. Text normalization + bypass variation generation (leetspeak, masking
//      characters, unicode confusables, repeated characters, spacing tricks).
//   2. Banned-word matching with word boundaries + compiled bypass patterns.
//   3. Suspicious-word matching (queues for manual review instead of blocking).
//
// Word lists can be extended at runtime from the `moderation_config/filters`
// Firestore document so admins can manage them without a redeploy.

const DEFAULT_BANNED_WORDS = [
  'spam', 'hate', 'stupid', 'dumb', 'sucks', 'terrible', 'worst', 'garbage',
  'trash', 'crap', 'shit', 'damn', 'hell', 'fuck', 'bitch', 'ass', 'dick',
  'idiot', 'moron', 'loser', 'noob', 'scrub', 'toxic', 'cancer', 'retard',
  'gay', 'fag', 'nigger', 'nazi', 'hitler', 'kill', 'die', 'suicide'
];

const DEFAULT_SUSPICIOUS_WORDS = [
  'maybe', 'might', 'could be', 'not sure', 'uncertain', 'confusing',
  'hard to understand', 'complicated', 'difficult', 'boring', 'meh',
  'okay', 'average', 'mediocre', 'unsure', 'doubt', 'questionable'
];

// Compiled bypass-detection patterns (mask characters between letters, leet
// substitutions, doubled letters). Kept in sync with the client-side
// MODERATION_PATTERNS in the games page.
const DEFAULT_BANNED_PATTERNS = [
  /\bf+[*@#$%^&+=_\-~`|\\/ ]*[aeiou4*@#$%^&+=_\-~`|\\/ ]*c+[*@#$%^&+=_\-~`|\\/ ]*k+\b/i,
  /\bf+[u*@#$%^&+=_\-~`|\\/ ]*c+[*@#$%^&+=_\-~`|\\/ ]*k+\b/i,
  /\bs+[*@#$%^&+=_\-~`|\\/ ]*h+[*@#$%^&+=_\-~`|\\/ ]*[i1*@#$%^&+=_\-~`|\\/ ]*t+\b/i,
  /\bsh[*@#$%^&+=_\-~`|\\/ ]*t\b/i,
  /\bb+[*@#$%^&+=_\-~`|\\/ ]*[i1*@#$%^&+=_\-~`|\\/ ]*t+[*@#$%^&+=_\-~`|\\/ ]*c+h+\b/i,
  /\bb[*@#$%^&+=_\-~`|\\/ ]*tch\b/i,
  /\bass+\b/i,
  /\ba+[*@#$%^&+=_\-~`|\\/ ]*s+[*@#$%^&+=_\-~`|\\/ ]*s+\b/i,
  /\bd+[*@#$%^&+=_\-~`|\\/ ]*[a4@*#$%^&+=_\-~`|\\/ ]*m+n+\b/i,
  /\bd[*@#$%^&+=_\-~`|\\/ ]*mn\b/i,
  /\bhell+\b/i,
  /\bh+[*@#$%^&+=_\-~`|\\/]*e+[*@#$%^&+=_\-~`|\\/]*l+[*@#$%^&+=_\-~`|\\/]*l+\b/i,
  /\b[ck]+r+[*@#$%^&+=_\-~`|\\/ ]*[a4@*#$%^&+=_\-~`|\\/ ]*p+\b/i,
  /\bt+r+[*@#$%^&+=_\-~`|\\/ ]*[a4@*#$%^&+=_\-~`|\\/ ]*s+h+\b/i,
  /\bs+t+[*@#$%^&+=_\-~`|\\/ ]*u+p+[*@#$%^&+=_\-~`|\\/ ]*[i1*@#$%^&+=_\-~`|\\/ ]*d+\b/i,
  /\bd+u+m+b+\b/i,
  /\b[i1*@#$%^&+=_\-~`|\\/ ]*d+[i1*@#$%^&+=_\-~`|\\/ ]*[o0*@#$%^&+=_\-~`|\\/ ]*t+\b/i,
  /\bm+[o0*@#$%^&+=_\-~`|\\/ ]*r+[o0*@#$%^&+=_\-~`|\\/ ]*n+\b/i,
  /\bl+[o0*@#$%^&+=_\-~`|\\/ ]*s+[e3*@#$%^&+=_\-~`|\\/ ]*r+\b/i,
  /\bn+[o0*@#$%^&+=_\-~`|\\/ ]*[o0*@#$%^&+=_\-~`|\\/ ]*b+\b/i,
  /\bs+[ck]+r+u+b+\b/i,
  /\bt+[o0*@#$%^&+=_\-~`|\\/ ]*x+[i1*@#$%^&+=_\-~`|\\/ ]*[ck]+\b/i,
  // Slur bypass patterns: `+` quantifiers keep matching when letters are
  // doubled ("niggerr") or mask characters are inserted between letters.
  /\bn+[i1!*@#$%^&+=_\-~`|\\/ ]*g+g+[a4e3*@#$%^&+=_\-~`|\\/ ]*r+\b/i,
  /\bn+i+g+g+a+s*\b/i,
  /\bf+[a4@*@#$%^&+=_\-~`|\\/ ]*g+g+[o0*@#$%^&+=_\-~`|\\/ ]*t+\b/i,
  /\bf+a+g+s*\b/i
];

const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'l', '+': 't', '€': 'e', '£': 'l'
};

// Common unicode lookalikes used to slip words past plain filters.
const CONFUSABLE_MAP = {
  '\u0430': 'a', '\u0431': 'b', '\u0432': 'b', '\u0433': 'r', '\u0434': 'd',
  '\u0435': 'e', '\u0437': 'z', '\u0438': 'i', '\u043a': 'k', '\u043b': 'l',
  '\u043c': 'm', '\u043d': 'h', '\u043e': 'o', '\u043f': 'p', '\u0440': 'p',
  '\u0441': 'c', '\u0442': 't', '\u0443': 'y', '\u0445': 'x', '\u0456': 'i',
  '\u0391': 'a', '\u0392': 'b', '\u0395': 'e', '\u039f': 'o',
  '\u03a1': 'p', '\u03a4': 't', '\u03a7': 'x', '\u03b1': 'a',
  '\u03bf': 'o', '\u03c1': 'p', '\u03c2': 's', '\u03c5': 'u',
  '\u03bd': 'v', '\u03c7': 'x',
  '\u200b': '', '\u200c': '', '\u200d': '', '\ufeff': '',
  '\u00ad': ''
};

const MASK_CHARS = /[*@#$%^&+=_\-~`|\\/]/g;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapChars(input, map) {
  let out = '';
  for (const ch of input) out += Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
  return out;
}

export function createContentFilter(config = {}) {
  const bannedWords = [...new Set([
    ...DEFAULT_BANNED_WORDS,
    ...(Array.isArray(config.bannedWords) ? config.bannedWords : [])
  ])].map((w) => String(w).toLowerCase()).filter(Boolean);

  const suspiciousWords = [...new Set([
    ...DEFAULT_SUSPICIOUS_WORDS,
    ...(Array.isArray(config.suspiciousWords) ? config.suspiciousWords : [])
  ])].map((w) => String(w).toLowerCase()).filter(Boolean);

  const bannedPatterns = [...DEFAULT_BANNED_PATTERNS];
  for (const p of (Array.isArray(config.bannedPatterns) ? config.bannedPatterns : [])) {
    try {
      if (typeof p === 'string') bannedPatterns.push(new RegExp(p, 'i'));
      else if (p instanceof RegExp) bannedPatterns.push(p);
    } catch {
      // Ignore malformed admin-supplied patterns
    }
  }

  // Build word-boundary regexes once instead of per submission.
  const bannedWordRegexes = bannedWords.map((word) => ({
    word,
    regex: new RegExp('\\b' + escapeRegex(word) + '\\b', 'i')
  }));

  // Suspicious words also match on word boundaries — plain substring search
  // on the compact variations false-positives ("game had" contains "meh").
  const suspiciousWordRegexes = suspiciousWords.map((word) => ({
    word,
    regex: new RegExp('\\b' + escapeRegex(word) + '\\b', 'i')
  }));

  function createVariations(input) {
    // Step 1: canonical cleanups applied to every variation.
    const deConfused = mapChars(String(input), CONFUSABLE_MAP);
    const deAccented = deConfused
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
    const lower = deAccented.toLowerCase();
    const deLeeted = mapChars(lower, LEET_MAP);
    const deMasked = lower.replace(MASK_CHARS, '');
    const deMaskedLeeted = deLeeted.replace(MASK_CHARS, '');

    const base = [
      lower,
      deLeeted,
      deMasked,
      deMaskedLeeted,
      // Collapse separators/whitespace into single spaces, then drop spaces
      // entirely so "f u c k" and "f*u*c*k" both collapse to "fuck".
      deLeeted.replace(/[^a-z0-9]+/g, ' ').trim(),
      deLeeted.replace(/[^a-z0-9]+/g, ''),
      deLeeted.replace(/\s+/g, '')
    ].filter(Boolean);

    // Collapse runs of the same character ("fuuuuck" -> "fuuck") on compact
    // forms so repeated-letter bypasses still match.
    for (const v of [...base]) {
      base.push(v.replace(/(.)\1{2,}/g, '$1$1'));
    }

    return [...new Set(base)];
  }

  function check(text) {
    if (!text || String(text).trim() === '') {
      return { status: 'approved', reason: 'no comment provided', matches: [] };
    }

    const variations = createVariations(text);
    const matches = [];

    for (const variation of variations) {
      for (const pattern of bannedPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(variation)) {
          matches.push({ type: 'banned-pattern', sample: variation.slice(0, 60) });
          return {
            status: 'blocked',
            reason: 'inappropriate content detected (bypass attempt)',
            matches
          };
        }
      }
    }

    for (const { word, regex } of bannedWordRegexes) {
      for (const variation of variations) {
        if (regex.test(variation)) {
          matches.push({ type: 'banned-word', word });
          return {
            status: 'blocked',
            reason: 'inappropriate content detected',
            matches
          };
        }
      }
    }

    for (const { word, regex } of suspiciousWordRegexes) {
      for (const variation of variations) {
        if (regex.test(variation)) {
          matches.push({ type: 'suspicious-word', word });
          return {
            status: 'pending',
            reason: 'content requires manual review',
            matches
          };
        }
      }
    }

    return { status: 'approved', reason: 'content approved automatically', matches };
  }

  return { check, createVariations };
}
