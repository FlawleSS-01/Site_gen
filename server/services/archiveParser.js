import JSZip from 'jszip';
import path from 'path';
import mammoth from 'mammoth';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

const PAGE_NAME_MAP = {
  'casino': 'Casino',
  'casino (homepage)': 'Casino',
  'homepage': 'Casino',
  'home': 'Casino',
  'login': 'Login',
  'app': 'Mobile App',
  'mobile app': 'Mobile App',
  'bonuses': 'Bonuses',
  'bonus': 'Bonuses',
  'aviator': 'Aviator',
  'games': 'Games',
  'betting': 'Betting',
  'sports': 'Betting'
};

function normalizePageName(raw) {
  const cleaned = raw.replace(/\s*\([^)]*\)/g, '').trim();
  const key = cleaned.toLowerCase();
  return PAGE_NAME_MAP[key] || cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function normalizeWordChars(text) {
  return text
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function parseContentFile(text) {
  text = normalizeWordChars(text);
  const lines = text.split('\n');
  let brand = '';
  let domain = '';
  let offerUrl = '';
  const pageMeta = {};
  let contentSection = '';
  const pages = [];

  let section = 'header';
  let currentMetaPage = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (section === 'meta') currentMetaPage = null;
      continue;
    }

    if (/^-{2,}\s*META\s*-{2,}$/i.test(trimmed)) {
      section = 'meta';
      continue;
    }

    if (/^-{2,}\s*CONTENT\s*-{2,}$/i.test(trimmed)) {
      section = 'content';
      contentSection = lines.slice(i + 1).join('\n');
      break;
    }

    if (section === 'header') {
      const brandMatch = trimmed.match(/^Brand:\s*(.+)$/i);
      if (brandMatch) { brand = brandMatch[1].trim(); continue; }

      const domainMatch = trimmed.match(/^Domain:\s*(.+)$/i);
      if (domainMatch) { domain = domainMatch[1].trim(); continue; }

      const offerMatch = trimmed.match(/^Offer:\s*(.+)$/i);
      if (offerMatch) { offerUrl = offerMatch[1].trim(); continue; }
    }

    if (section === 'meta') {
      const pageMatch = trimmed.match(/^Page:\s*(.+)$/i);
      if (pageMatch) {
        const pageName = normalizePageName(pageMatch[1].trim());
        if (!pages.includes(pageName)) pages.push(pageName);
        currentMetaPage = pageName;
        pageMeta[pageName] = { keywords: '', description: '' };
        continue;
      }

      const kwMatch = trimmed.match(/^keywords:\s*(.+)$/i);
      if (kwMatch && currentMetaPage) {
        pageMeta[currentMetaPage].keywords = kwMatch[1].trim();
        continue;
      }

      const descMatch = trimmed.match(/^description:\s*(.+)$/i);
      if (descMatch && currentMetaPage) {
        pageMeta[currentMetaPage].description = descMatch[1].trim();
        continue;
      }
    }
  }

  if (!brand && domain) {
    brand = domain.split('.')[0].toUpperCase();
  }

  return { brand, domain, offerUrl, pages, pageMeta, contentSection };
}

async function extractDocxText(buffer) {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
}

export async function parseArchive(zipBuffer) {
  const zip = await JSZip.loadAsync(zipBuffer);

  const verificationFiles = [];
  let logoBuffer = null;
  let logoFilename = null;
  let contentText = null;

  for (const [filePath, file] of Object.entries(zip.files)) {
    if (file.dir) continue;

    const name = path.basename(filePath);
    const ext = path.extname(name).toLowerCase();

    if (/^BingSiteAuth/i.test(name) && ext === '.xml') {
      const buf = await file.async('nodebuffer');
      verificationFiles.push({ name, buffer: buf });
      continue;
    }

    if (/^google/i.test(name) && ext === '.html') {
      const buf = await file.async('nodebuffer');
      verificationFiles.push({ name, buffer: buf });
      continue;
    }

    if (IMAGE_EXTENSIONS.includes(ext) && !logoBuffer) {
      logoBuffer = await file.async('nodebuffer');
      logoFilename = name;
      continue;
    }

    if ((ext === '.docx' || ext === '.doc') && !contentText) {
      const buf = await file.async('nodebuffer');
      contentText = await extractDocxText(buf);
      continue;
    }

    if (ext === '.txt' && !contentText) {
      contentText = await file.async('string');
      continue;
    }
  }

  if (!contentText) {
    throw new Error('No content file (.docx or .txt) found in the archive');
  }

  const parsed = parseContentFile(contentText);

  if (!parsed.brand) throw new Error('Could not extract brand name from content file');
  if (!parsed.domain) throw new Error('Could not extract domain from content file');
  if (!parsed.pages.length) throw new Error('Could not extract pages from content file');

  return {
    brand: parsed.brand,
    domain: parsed.domain,
    offerUrl: parsed.offerUrl || '',
    pages: parsed.pages,
    pageMeta: parsed.pageMeta,
    contentTemplate: parsed.contentSection,
    verificationFiles,
    logoBuffer,
    logoFilename,
    filesFound: {
      logo: logoFilename || null,
      verifications: verificationFiles.map(f => f.name),
      contentFile: true,
      pages: parsed.pages
    }
  };
}
