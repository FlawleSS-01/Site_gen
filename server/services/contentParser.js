/**
 * Parses content template in format:
 * 1. PageName (Optional) – Subtitle or description
 * Content for this page...
 *
 * 2. NextPage – Subtitle
 * More content...
 */

const PAGE_ALIASES = {
  'casino': ['home', 'homepage', 'main', 'casino'],
  'login': ['login', 'sign in', 'signin', 'secure access'],
  'app': ['app', 'mobile', 'download', 'mobile app', 'apk'],
  'bonuses': ['bonuses', 'bonus', 'promotions', 'welcome bonus'],
  'aviator': ['aviator', 'crash', 'crash game'],
  'games': ['games', 'slots', 'game', 'slot'],
  'betting': ['betting', 'sports', 'sportsbook', 'bet']
};

function normalizePageName(name) {
  return name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
}

function findMatchingPage(parsedName, userPages) {
  const normalized = normalizePageName(parsedName);
  const firstWord = normalized.split(/\s+/)[0];

  for (const up of userPages) {
    const u = up.toLowerCase();
    if (u === normalized || normalized.includes(u) || u.includes(normalized)) return up;
    if (u.startsWith(firstWord) || firstWord.startsWith(u)) return up;
  }

  for (const [key, aliases] of Object.entries(PAGE_ALIASES)) {
    if (normalized.includes(key) || aliases.some(a => normalized.includes(a))) {
      for (const up of userPages) {
        const u = up.toLowerCase();
        if (u === 'casino' && key === 'casino') return up;
        if (u === 'home' && (key === 'casino' || aliases.includes('homepage'))) return up;
        if (u === 'mobile app' && (key === 'app' || normalized.includes('app'))) return up;
        if (aliases.some(a => u.includes(a) || a.includes(u))) return up;
      }
    }
  }

  return userPages[0] || 'Casino';
}

const SECTION_EMOJIS = /^([📝📲🎁🔥🎯♠🏆🎮💡🔒🚀⚽🏏🎾📱✈️])\s+(.+)$/;
const BULLET_PATTERN = /^[✅•\-]\s+(.+)$/;

function isHeadingLine(line) {
  if (!line || line.length > 100 || line.length < 10) return false;
  if (BULLET_PATTERN.test(line)) return false;
  if (SECTION_EMOJIS.test(line)) return true;
  if (/[.]{2,}/.test(line)) return false;

  const endsQuestion = line.endsWith('?');
  const endsExclaim = line.endsWith('!');
  const containsDash = /\s[–—\-]\s/.test(line);
  const noTrailingPeriod = !line.endsWith('.');
  const shortEnough = line.length < 80;
  const hasTitleWords = /^[A-Z🎰]/.test(line);

  if ((endsQuestion || endsExclaim) && shortEnough) return true;
  if (containsDash && shortEnough && noTrailingPeriod && hasTitleWords) return true;
  if (shortEnough && noTrailingPeriod && hasTitleWords && !line.includes(',') && line.split(' ').length <= 12) return true;

  return false;
}

function extractBlocks(text) {
  const blocks = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentTitle = null;
  let currentContent = [];
  let currentType = 'paragraph';

  function pushCurrentBlock() {
    const content = currentContent.join('\n').trim();
    if (content.length > 10 || (currentTitle && content.length > 0)) {
      const hasBullets = currentContent.some(c => BULLET_PATTERN.test(c));
      blocks.push({
        title: currentTitle || deriveTitle(content),
        content,
        type: hasBullets ? 'list' : 'paragraph'
      });
    }
    currentTitle = null;
    currentContent = [];
    currentType = 'paragraph';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const emojiMatch = line.match(SECTION_EMOJIS);

    if (emojiMatch) {
      pushCurrentBlock();
      currentTitle = emojiMatch[2];
      continue;
    }

    if (BULLET_PATTERN.test(line)) {
      currentContent.push(line.replace(BULLET_PATTERN, '$1'));
      continue;
    }

    if (isHeadingLine(line) && !BULLET_PATTERN.test(line)) {
      const nextLine = lines[i + 1];
      const nextIsLong = nextLine && nextLine.length > line.length && !isHeadingLine(nextLine);
      const hasContent = currentContent.length > 0;

      if (hasContent || currentTitle) {
        pushCurrentBlock();
      }
      currentTitle = line;
      continue;
    }

    if (line.length > 10) {
      currentContent.push(line);
    }
  }

  pushCurrentBlock();
  return blocks;
}

function deriveTitle(content) {
  if (!content) return 'More Info';
  const first = content.split(/[.!?]/)[0]?.trim();
  if (first && first.length >= 15 && first.length <= 70) {
    return first + (first.endsWith('.') ? '' : '.');
  }
  const words = content.split(/\s+/).slice(0, 8).join(' ');
  return words.length > 50 ? words.substring(0, 50) + '...' : words + '...';
}

export function parseContentByPages(contentTemplate, userPages) {
  if (!contentTemplate || !contentTemplate.trim()) return null;

  const result = {};
  const pageBlocks = contentTemplate.split(/\n\s*(?=\d+\.\s+)/);

  for (const block of pageBlocks) {
    const trimmed = block.trim();
    if (!trimmed || !/^\d+\.\s+/.test(trimmed)) continue;

    const firstNewline = trimmed.indexOf('\n');
    const firstLine = firstNewline >= 0 ? trimmed.substring(0, firstNewline) : trimmed;
    const rawContent = firstNewline >= 0 ? trimmed.substring(firstNewline + 1).trim() : '';

    const m = firstLine.match(/^\d+\.\s+([^–—\-]+)(?:\s*[–—\-]\s*(.+?))?$/);
    if (!m) continue;

    const pageName = m[1].trim();
    const subtitle = m[2]?.trim() || '';
    const matchedPage = findMatchingPage(pageName, userPages);
    const blocks = extractBlocks(rawContent);

    if (!result[matchedPage]) {
      result[matchedPage] = { subtitle, blocks, rawContent };
    } else {
      result[matchedPage].blocks.push(...blocks);
      result[matchedPage].rawContent += '\n\n' + rawContent;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function getHeroSubtitle(parsedPage, brand, pageName) {
  if (parsedPage?.subtitle && parsedPage.subtitle.length > 20) {
    return parsedPage.subtitle;
  }
  const firstBlock = parsedPage?.blocks?.[0];
  if (firstBlock?.content) {
    const text = String(firstBlock.content);
    const firstSentence = text.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 25) return firstSentence + '.';
  }
  return `Welcome to ${brand} — discover the best ${pageName} experience. Play now!`;
}

const MAX_CONTENT_PER_BLOCK = 220;

function splitLongContent(text, maxLen = MAX_CONTENT_PER_BLOCK) {
  const str = String(text || '').trim();
  if (str.length <= maxLen) return [str];

  const lines = str.split('\n').filter(Boolean);
  if (lines.length > 1 && lines.every(l => l.length < maxLen * 2)) {
    const parts = [];
    let current = '';
    for (const line of lines) {
      if ((current + '\n' + line).trim().length > maxLen && current) {
        parts.push(current.trim());
        current = line;
      } else {
        current = current ? current + '\n' + line : line;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.length > 0 ? parts : [str.substring(0, maxLen) + '...'];
  }

  const parts = [];
  const sentences = str.split(/(?<=[.!?])\s+/).filter(Boolean);
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxLen && current) {
      parts.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length > 0 ? parts : [str.substring(0, maxLen) + '...'];
}

function extractUniqueTitle(content, usedTitles) {
  if (!content) return 'Learn More';

  const sentences = content.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 10);

  for (const sent of sentences) {
    if (sent.length >= 15 && sent.length <= 65 && !usedTitles.has(sent)) {
      usedTitles.add(sent);
      return sent;
    }
  }

  const phrases = content.split(/[,;–—]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 60);
  for (const ph of phrases) {
    if (!usedTitles.has(ph)) {
      usedTitles.add(ph);
      return ph;
    }
  }

  const words = content.split(/\s+/);
  const snippet = words.slice(0, 7).join(' ');
  if (!usedTitles.has(snippet)) {
    usedTitles.add(snippet);
    return snippet + '...';
  }

  return words.slice(0, 5).join(' ') + ' (' + (usedTitles.size + 1) + ')';
}

export function blocksToSections(blocks, shuffle = true) {
  if (!blocks || blocks.length === 0) return [];

  const usedTitles = new Set();
  const expanded = [];

  for (const b of blocks) {
    const content = typeof b.content === 'string' ? b.content : String(b.content || '');
    const parts = splitLongContent(content);

    parts.forEach((part, idx) => {
      let title;
      if (idx === 0) {
        title = b.title || deriveTitle(part);
      } else {
        title = extractUniqueTitle(part, usedTitles);
      }

      if (usedTitles.has(title) && idx === 0) {
        const alt = extractUniqueTitle(part, usedTitles);
        if (alt !== title) title = alt;
      }
      usedTitles.add(title);

      expanded.push({
        title,
        content: part,
        hasCTA: false,
        type: b.type || 'paragraph'
      });
    });
  }

  let arr = expanded.map((b, i) => ({
    title: b.title,
    content: b.content,
    hasCTA: i === 0 || i === expanded.length - 1,
    type: b.type
  }));

  if (shuffle && arr.length > 2) {
    const first = arr[0];
    const last = arr[arr.length - 1];
    const middle = arr.slice(1, -1);
    const seed = Date.now() % 1000;
    middle.sort((a, b) => {
      const ha = (a.title.charCodeAt(0) + seed) % 5;
      const hb = (b.title.charCodeAt(0) + seed) % 5;
      return ha - hb;
    });
    arr = [first, ...middle, last];
  }

  return arr;
}
