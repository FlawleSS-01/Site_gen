import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePageSections, generateMetaContent } from './textGenerator.js';
import { generateAllImages } from './imageGenerator.js';
import { generateSitemap, generateRobotsTxt, generateCanonicalUrl, generateOpenGraphTags } from './seoGenerator.js';
import { parseContentByPages, getHeroSubtitle, blocksToSections } from './contentParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_SOURCE = path.resolve(__dirname, '../../client/public/games');
const SPORTS_SOURCE = path.resolve(__dirname, '../../client/public/sports');
const GAME_NAMES = ['sweet_bonanza', 'mega_reels', 'gates_of_olympus', 'aviator', 'teen_patti', 'wolf_gold', 'lightning_roulette', 'andar_bahar', 'vip_blackjack', 'crazy_time'];
const SPORT_IMAGES = {
  cricket: 'cricket.webp',
  football: 'football.jpg',
  esports: 'esports.jpg',
  other: 'other.jpg'
};

const COLOR_SCHEMES = {
  gold: { primary: 'amber', accent: 'yellow', bg: 'slate' },
  red: { primary: 'red', accent: 'rose', bg: 'slate' },
  purple: { primary: 'purple', accent: 'violet', bg: 'slate' },
  neon: { primary: 'emerald', accent: 'cyan', bg: 'slate' },
  blue: { primary: 'blue', accent: 'indigo', bg: 'slate' },
  orange: { primary: 'orange', accent: 'amber', bg: 'slate' }
};

const FONT_SETS = [
  { name: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap', family: "'Poppins', sans-serif" },
  { name: 'Outfit', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap', family: "'Outfit', sans-serif" },
  { name: 'Exo 2', url: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800&display=swap', family: "'Exo 2', sans-serif" },
  { name: 'Raleway', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800&display=swap', family: "'Raleway', sans-serif" },
  { name: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap', family: "'Oswald', sans-serif" },
  { name: 'Bebas Neue', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&display=swap', family: "'Bebas Neue', 'Inter', sans-serif" }
];

const ANIMATION_SETS = [
  ['float', 'shimmer', 'ticker'],
  ['slide-up', 'pulse', 'ticker'],
  ['bounce', 'glow', 'shimmer'],
  ['spin-slow', 'float', 'pulse']
];

const LOGO_EXT_MAP = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/svg+xml': '.svg', 'image/webp': '.webp' };

export async function generateProject(config, emitProgress) {
  const { brand, domain, pages, contentTemplate, logoData, meta, offerUrl, imageStyle, colorScheme } = config;
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.gold;
  const projectName = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fontSet = FONT_SETS[Math.floor(Math.random() * FONT_SETS.length)];
  const animSet = ANIMATION_SETS[Math.floor(Math.random() * ANIMATION_SETS.length)];
  const parsedContent = contentTemplate ? parseContentByPages(contentTemplate, pages) : null;
  const totalSteps = 3 + pages.length * 3;
  let currentStep = 0;

  const step = (msg) => {
    currentStep++;
    emitProgress(currentStep, totalSteps, msg);
  };

  const zip = new JSZip();
  const root = zip.folder(projectName);

  step('Creating project structure...');
  writeConfigFiles(root, brand, projectName, fontSet);

  let logoPath = null;
  const logoBase64 = logoData?.base64 || (typeof logoData === 'string' ? logoData : null);
  if (logoBase64) {
    try {
      const match = String(logoBase64).match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = (match[1] || '').toLowerCase();
        const buf = Buffer.from(match[2], 'base64');
        const ext = LOGO_EXT_MAP[mime] || (logoData?.name ? path.extname(logoData.name).toLowerCase() : null) || '.png';
        const logoFilename = `logo${ext.startsWith('.') ? ext : '.' + ext}`;
        root.file(`public/${logoFilename}`, buf);
        logoPath = `/${logoFilename}`;
        console.log(`[ZIP] Added logo: public/${logoFilename} (${(buf.length / 1024).toFixed(1)} KB)`);
      } else {
        console.warn('[Logo] Invalid base64 format, expected data:image/...;base64,...');
      }
    } catch (e) {
      console.warn('[Logo] Could not add logo:', e.message);
    }
  }

  // Copy game images from client/public/games
  const gamesList = [];
  try {
    if (fs.existsSync(GAMES_SOURCE)) {
      const files = fs.readdirSync(GAMES_SOURCE);
      const ext = ['.webp', '.png', '.jpg', '.jpeg'];
      for (const f of files) {
        const extMatch = ext.find(e => f.toLowerCase().endsWith(e));
        if (extMatch) {
          const name = path.basename(f, extMatch);
          const buf = fs.readFileSync(path.join(GAMES_SOURCE, f));
          root.file(`public/games/${f}`, buf);
          const displayName = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          gamesList.push({ src: `/games/${f}`, name: displayName });
        }
      }
    }
    if (gamesList.length === 0) {
      for (const n of GAME_NAMES) {
        const webp = `${n}.webp`;
        const p = path.join(GAMES_SOURCE, webp);
        if (fs.existsSync(p)) {
          root.file(`public/games/${webp}`, fs.readFileSync(p));
          const displayName = n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          gamesList.push({ src: `/games/${webp}`, name: displayName });
        }
      }
    }
  } catch (e) {
    console.warn('[Games] Could not load game images:', e.message);
  }

  // Copy sports images from client/public/sports
  const sportImages = {};
  try {
    if (fs.existsSync(SPORTS_SOURCE)) {
      for (const [sport, filename] of Object.entries(SPORT_IMAGES)) {
        const fp = path.join(SPORTS_SOURCE, filename);
        if (fs.existsSync(fp)) {
          const buf = fs.readFileSync(fp);
          root.file(`public/sports/${filename}`, buf);
          sportImages[sport] = `/sports/${filename}`;
          console.log(`[ZIP] Added sport image: public/sports/${filename}`);
        }
      }
    }
  } catch (e) {
    console.warn('[Sports] Could not load sport images:', e.message);
  }

  // Generate images
  const pageImages = {};
  for (const page of pages) {
    step(`Generating image for "${page}" page...`);
    try {
      const images = await generateAllImages([page], brand, imageStyle || 'modern', colorScheme || 'blue', null);
      if (images[page]) {
        const img = images[page];
        root.file(`public/images/${img.filename}`, img.buffer);
        pageImages[page] = `/images/${img.filename}`;
        console.log(`[ZIP] Added image: public/images/${img.filename} (${(img.size / 1024).toFixed(0)}KB)`);
      }
    } catch (err) {
      console.error(`Image gen failed for ${page}:`, err.message);
    }
  }

  // Generate content & page components
  const pageData = {};
  for (const page of pages) {
    step(`Generating content for "${page}" page...`);
    let sections;
    const parsedPage = parsedContent?.[page];

    if (parsedPage && parsedPage.blocks?.length > 0) {
      const secs = blocksToSections(parsedPage.blocks, true);
      const heroTitle = parsedPage.blocks[0]?.title || `${page} - ${brand}`;
      const heroSub = getHeroSubtitle(parsedPage, brand, page);
      sections = {
        heroTitle: secs[0]?.title || `${page} - ${brand}`,
        heroSubtitle: heroSub,
        sections: secs.map((s, i) => ({
          title: s.title,
          content: s.content,
          hasCTA: i === 0 || i === secs.length - 1,
          type: s.type
        })),
        ctaText: 'Play Now'
      };
    } else if (contentTemplate && contentTemplate.trim()) {
      const parsed = parseContentByPages(contentTemplate, pages);
      const pp = parsed?.[page];
      if (pp?.blocks?.length > 0) {
        const secs = blocksToSections(pp.blocks, true);
        sections = {
          heroTitle: secs[0]?.title || `${page} - ${brand}`,
          heroSubtitle: getHeroSubtitle(pp, brand, page),
          sections: secs.map((s, i) => ({
            title: s.title,
            content: s.content,
            hasCTA: i === 0 || i === secs.length - 1,
            type: s.type
          })),
          ctaText: 'Play Now'
        };
      } else {
        sections = await generatePageSections(brand, domain, page, offerUrl);
      }
    } else {
      sections = await generatePageSections(brand, domain, page, offerUrl);
    }

    const pageMeta = await generateMetaContent(brand, domain, page, meta);
    const ogTags = generateOpenGraphTags(pageMeta, domain, page, brand);
    const canonical = generateCanonicalUrl(domain, page);

    pageData[page] = { sections, meta: pageMeta, ogTags, canonical };
  }

  step('Generating SEO files...');
  root.file('public/sitemap.xml', generateSitemap(domain, pages));
  root.file('public/robots.txt', generateRobotsTxt(domain));

  step('Assembling React components...');

  root.file('src/index.css', generateCSS(colors, fontSet, animSet));
  root.file('src/main.jsx', generateMainJsx(fontSet));
  const indexPage = pages.find(p => INDEX_PAGES.includes(p.toLowerCase().trim()));
  root.file('src/App.jsx', generateAppJsx(pages, brand, indexPage));
  root.file('src/components/Header.jsx', generateHeaderJsx(pages, brand, offerUrl, colors, indexPage, logoPath));
  root.file('src/components/Footer.jsx', generateFooterJsx(pages, brand, domain, colors, indexPage, logoPath));
  root.file('src/components/CTAButton.jsx', generateCTAButtonJsx(offerUrl, colors));
  root.file('src/components/SEOHead.jsx', generateSEOHeadJsx());
  root.file('src/components/Ticker.jsx', generateTickerJsx(colors));
  if (gamesList.length > 0) {
    root.file('src/components/GameGrid.jsx', generateGameGridJsx(colors, gamesList, offerUrl, domain));
  }

  const layoutSeed = Date.now() + Math.floor(Math.random() * 100000);
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const data = pageData[page];
    const image = pageImages[page];
    const componentName = toComponentName(page);
    const layout = pickLayout(page, i, pages.length, layoutSeed);
    const includeGameGrid = gamesList.length > 0 && ['casino-games'].includes(layout);
    root.file(`src/pages/${componentName}.jsx`, generatePageJsx(page, componentName, data, image, offerUrl, colors, brand, domain, layout, animSet, includeGameGrid, layoutSeed + i, sportImages));
  }

  root.file('README.md', generateReadme(brand, domain, pages));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { data: zipBuffer, projectName };
}

// ── Layout selection ──────────────────────────────────────────────

const LAYOUT_MAP = {
  casino: 'casino-home',
  home: 'casino-home',
  games: 'casino-games',
  bonuses: 'casino-bonuses',
  'mobile app': 'casino-app',
  app: 'casino-app',
  aviator: 'casino-aviator',
  betting: 'casino-betting',
  login: 'casino-login',
  contact: 'contact-cards',
  faq: 'accordion',
  slots: 'casino-games',
  'live casino': 'casino-games',
  promotions: 'casino-bonuses'
};

const LAYOUT_FALLBACKS = ['casino-home', 'casino-games', 'casino-bonuses', 'casino-app', 'casino-aviator', 'casino-timeline', 'casino-bento', 'casino-login', 'casino-betting', 'casino-sections'];

function pickLayout(pageName, index, total, layoutSeed = 0) {
  const key = pageName.toLowerCase().trim();
  if (LAYOUT_MAP[key]) return LAYOUT_MAP[key];
  const idx = Math.floor((layoutSeed + index * 13 + total * 7) % LAYOUT_FALLBACKS.length);
  return LAYOUT_FALLBACKS[Math.abs(idx)];
}

// ── Page JSX generator with diverse layouts ───────────────────────

const TRUNCATE_LEN = 160;

function truncateContent(str, max = TRUNCATE_LEN) {
  const s = String(str || '').trim();
  if (s.length <= max) return s;
  const cut = s.substring(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.substring(0, lastSpace) : cut) + '...';
}

function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((seed % (i + 1) + i) % (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePageJsx(pageName, componentName, data, imagePath, offerUrl, colors, brand, domain, layout, animSet = [], includeGameGrid = false, layoutSeed = 0, sportImages = {}) {
  const { sections, meta, ogTags, canonical } = data;
  const esc = escapeJsx;
  const trunc = truncateContent;
  const p = colors.primary;
  const a = colors.accent;
  const bg = colors.bg;

  const secs = shuffleWithSeed(sections.sections || [], layoutSeed);

  const seoBlock = `
      <SEOHead
        title="${esc(meta.title)}"
        description="${esc(meta.description)}"
        keywords="${esc(meta.keywords)}"
        canonical="${canonical}"
        ogTags={${JSON.stringify(ogTags)}}
      />`;

  const heroTitle = esc(sections.heroTitle);
  const heroSub = (sections.heroSubtitle && String(sections.heroSubtitle).length > 10)
    ? esc(sections.heroSubtitle)
    : `Welcome to ${esc(brand)} — discover the best ${esc(pageName)} experience. Play now!`;
  const ctaText = sections.ctaText || 'Play Now';
  const siteUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : '';
  const imgTag = imagePath ? `<img src="${imagePath}" alt="${esc(pageName)} - ${esc(brand)}" data-site="${siteUrl}" className="w-full h-full object-cover"` : null;
  const emojis = ['🎰', '🃏', '💰', '🎲', '🎯', '🔥', '⭐', '🏆', '💎', '🚀', '♠️', '🎁'];

  function renderSections(secsArr, startIdx = 0) {
    const animClasses = ['animate-float', 'animate-pulse', 'animate-shimmer', 'animate-bounce', 'animate-glow', 'animate-slide-up', 'animate-wiggle', 'animate-fade-in', 'animate-scale-in'];
    const bgPatterns = [
      `bg-slate-800/50`, `bg-slate-900/60`, `bg-slate-800/30`, `bg-slate-900/50`, `bg-slate-800/40`,
      `bg-slate-900/70`, `bg-gradient-to-r from-slate-800/50 to-slate-900/50`, `bg-gradient-to-b from-slate-800/40 to-slate-900/60`,
      `bg-gradient-to-br from-${p}-900/10 to-slate-900/60`, `bg-slate-800/60`, `bg-slate-900/40`, `bg-gradient-to-tr from-slate-800/60 to-slate-900/50`
    ];
    const listHtml = (sec) => sec.type === 'list'
      ? `<ul className="space-y-3 text-${bg}-300">${String(sec.content).split('\n').filter(Boolean).map(l => `<li className="flex gap-2"><span className="text-${p}-500">✓</span>${esc(l.trim())}</li>`).join('')}</ul>`
      : `<p className="text-${bg}-300 leading-relaxed">${esc(sec.content)}</p>`;
    const listGridHtml = (sec) => sec.type === 'list'
      ? `<div className="grid sm:grid-cols-2 gap-3">${String(sec.content).split('\n').filter(Boolean).map(l => `<div className="flex gap-2 text-${bg}-300"><span className="text-${p}-500 flex-shrink-0">✓</span>${esc(l.trim())}</div>`).join('')}</div>`
      : `<p className="text-${bg}-300 leading-relaxed text-lg">${esc(sec.content)}</p>`;
    const ctaHtml = (sec) => sec.hasCTA ? `<div className="mt-6"><CTAButton text="${ctaText}" /></div>` : '';
    const ctaSecHtml = (sec) => sec.hasCTA ? `<CTAButton text="${ctaText}" variant="secondary" />` : '';

    return secsArr.map((sec, i) => {
      const idx = startIdx + i;
      const anim = animClasses[(layoutSeed + i * 3) % animClasses.length];
      const bgPat = bgPatterns[(layoutSeed + i * 11) % bgPatterns.length];

    const sectionTemplates = [
      (sec) => `<section className="py-16 ${bgPat}">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="${idx % 2 !== 0 ? 'lg:order-2' : ''}">
              <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="bg-gradient-to-br from-${p}-500/10 to-${a}-500/10 rounded-2xl aspect-video flex items-center justify-center border border-${p}-500/20 ${idx % 2 !== 0 ? 'lg:order-1' : ''}">
              <span className="text-6xl animate-float">${emojis[idx % emojis.length]}</span>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/60">
        <div className="section-container">
          <div className="bg-gradient-to-r from-${p}-500/10 to-${a}-500/10 rounded-2xl p-8 md:p-12 border border-${p}-500/20">
            <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
            ${listGridHtml(sec)}${sec.hasCTA ? `<div className="mt-8"><CTAButton text="${ctaText}" /></div>` : ''}
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/30">
        <div className="section-container text-center max-w-3xl mx-auto">
          <span className="text-4xl block mb-4">${emojis[(idx + 3) % emojis.length]}</span>
          <h2 className="text-2xl font-bold text-white mb-4">${esc(sec.title)}</h2>
          <p className="text-${bg}-300 leading-relaxed mb-6">${esc(trunc(sec.content, 200))}</p>
          ${sec.hasCTA ? `<div className="mt-4">${ctaSecHtml(sec)}</div>` : ''}
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/50">
        <div className="section-container max-w-4xl mx-auto">
          <div className="relative pl-8 border-l-2 border-${p}-500/50">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-${p}-500 border-2 border-slate-900"></div>
            <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
            ${sec.type === 'list' ? `<ul className="space-y-2 text-${bg}-300">${String(sec.content).split('\n').filter(Boolean).map(l => `<li className="flex gap-2"><span className="text-${p}-500">→</span>${esc(l.trim())}</li>`).join('')}</ul>` : `<p className="text-${bg}-300 leading-relaxed">${esc(sec.content)}</p>`}
            ${ctaHtml(sec)}
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/40">
        <div className="section-container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-800/80 border border-${p}-500/20">
              <span className="text-3xl block mb-3">${emojis[(idx + 5) % emojis.length]}</span>
              <h2 className="text-xl font-bold text-white mb-2">${esc(sec.title)}</h2>
              <p className="text-${bg}-400 text-sm">${esc(trunc(sec.content, 100))}</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-${a}-500/20 flex items-center justify-center"><span className="text-5xl">${emojis[(idx + 7) % emojis.length]}</span></div>
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-${a}-500/20 flex items-center justify-center"><span className="text-5xl">${emojis[(idx + 9) % emojis.length]}</span></div>
            ${sec.hasCTA ? `<div className="lg:col-span-2 flex items-center justify-center">${ctaSecHtml(sec)}</div>` : ''}
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/60">
        <div className="section-container">
          <div className="columns-1 md:columns-2 gap-8 space-y-6">
            <div className="break-inside-avoid p-6 rounded-2xl bg-slate-800/80 border border-${p}-500/20">
              <h2 className="text-xl font-bold text-${p}-400 mb-3">${esc(sec.title)}</h2>
              <p className="text-${bg}-300 text-sm leading-relaxed">${esc(trunc(sec.content, 150))}</p>
              ${sec.hasCTA ? `<div className="mt-4">${ctaSecHtml(sec)}</div>` : ''}
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/30">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-8 rounded-2xl bg-gradient-to-br from-${p}-500/10 to-${a}-500/10 border border-${p}-500/20">
              <h2 className="text-2xl font-bold text-white mb-4">${esc(sec.title)}</h2>
              ${sec.type === 'list' ? `<ul className="space-y-2 text-${bg}-300">${String(sec.content).split('\n').filter(Boolean).map(l => `<li className="flex gap-2"><span className="text-${p}-500">•</span>${esc(l.trim())}</li>`).join('')}</ul>` : `<p className="text-${bg}-300 leading-relaxed">${esc(sec.content)}</p>`}
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex-1 rounded-2xl bg-slate-800/80 border border-${p}-500/20 flex items-center justify-center"><span className="text-5xl">${emojis[idx % emojis.length]}</span></div>
              ${sec.hasCTA ? ctaSecHtml(sec) : ''}
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(251,191,36,0.08)_0%,transparent_50%)]"></div>
        <div className="section-container relative">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[280px] p-6 rounded-2xl bg-slate-800/90 border border-${p}-500/30 hover:border-${p}-400/50 transition-all duration-300 shadow-lg hover:shadow-${p}-500/20">
              <span className="text-4xl block mb-3 ${anim}">${emojis[(idx + 2) % emojis.length]}</span>
              <h2 className="text-xl font-bold text-${p}-400 mb-2">${esc(sec.title)}</h2>
              <p className="text-${bg}-300 text-sm leading-relaxed">${esc(trunc(sec.content, 120))}</p>
              ${sec.hasCTA ? `<div className="mt-4">${ctaSecHtml(sec)}</div>` : ''}
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/40">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 row-span-2 p-6 rounded-2xl bg-gradient-to-br from-${p}-600/20 to-${a}-600/20 border-2 border-${p}-500/40 flex flex-col justify-center">
              <span className="text-5xl ${anim} block mb-3">${emojis[idx % emojis.length]}</span>
              <h2 className="text-xl font-bold text-white mb-2">${esc(sec.title)}</h2>
              <p className="text-${bg}-300 text-sm">${esc(trunc(sec.content, 90))}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-${p}-500/20 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 1) % emojis.length]}</span></div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-${a}-500/20 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 2) % emojis.length]}</span></div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-${p}-500/20 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 3) % emojis.length]}</span></div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-${a}-500/20 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 4) % emojis.length]}</span></div>
            ${sec.hasCTA ? `<div className="col-span-2 flex items-center justify-center">${ctaSecHtml(sec)}</div>` : ''}
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/60">
        <div className="section-container">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex gap-6">
              <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-${p}-500 via-${a}-500 to-transparent"></div>
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-${p}-500 border-4 border-slate-900 mt-1 ${anim}"></div>
              <div className="pb-8">
                <h2 className="text-2xl font-bold text-${p}-400 mb-3">${esc(sec.title)}</h2>
                ${sec.type === 'list' ? `<ul className="space-y-2 text-${bg}-300">${String(sec.content).split('\n').filter(Boolean).map(l => `<li className="flex gap-2"><span className="text-${p}-500">▸</span>${esc(l.trim())}</li>`).join('')}</ul>` : `<p className="text-${bg}-300 leading-relaxed">${esc(sec.content)}</p>`}
                ${sec.hasCTA ? `<div className="mt-4">${ctaSecHtml(sec)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 ${bgPat}">
        <div className="section-container">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-2xl bg-slate-800/70 border-l-4 border-${p}-500">
              <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-b from-${p}-500/20 to-${a}-500/10 border border-${p}-500/30 flex items-center justify-center">
              <span className="text-7xl ${anim}">${emojis[(idx + 4) % emojis.length]}</span>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/50">
        <div className="section-container">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2 p-6 rounded-2xl bg-slate-800/90 border border-${p}-500/20">
              <span className="text-4xl block mb-3">${emojis[idx % emojis.length]}</span>
              <h2 className="text-xl font-bold text-white mb-2">${esc(sec.title)}</h2>
              <p className="text-${bg}-400 text-sm">${esc(trunc(sec.content, 130))}</p>
              ${sec.hasCTA ? `<div className="mt-4">${ctaSecHtml(sec)}</div>` : ''}
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 flex items-center justify-center"><span className="text-4xl">${emojis[(idx + 1) % emojis.length]}</span></div>
            <div className="p-4 rounded-xl bg-slate-800/60 flex items-center justify-center"><span className="text-4xl">${emojis[(idx + 2) % emojis.length]}</span></div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/30">
        <div className="section-container max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-${p}-500 to-${a}-600 flex items-center justify-center text-3xl">${emojis[(idx + 6) % emojis.length]}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 ${bgPat}">
        <div className="section-container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-${p}-500/20 border-2 border-${p}-500/50 mb-6">
              <span className="text-4xl">${emojis[(idx + 8) % emojis.length]}</span>
            </div>
            <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
            <p className="text-${bg}-300 leading-relaxed mb-6">${esc(trunc(sec.content, 220))}</p>
            ${sec.hasCTA ? `<div className="mt-6">${ctaSecHtml(sec)}</div>` : ''}
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/60">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="order-2 lg:order-1 p-8 rounded-2xl bg-slate-800/80 border border-${p}-500/20">
              <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="order-1 lg:order-2 flex items-center justify-center">
              <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-${p}-500/30 to-${a}-500/30 border-2 border-${p}-500/40 flex items-center justify-center ${anim}">
                <span className="text-7xl">${emojis[(idx + 10) % emojis.length]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/40">
        <div className="section-container">
          <div className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-${p}-500 to-${a}-500 rounded-full"></div>
            <div className="absolute left-[-4px] top-2 w-3 h-3 rounded-full bg-${p}-500 border-2 border-slate-900 ${anim}"></div>
            <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
            ${listHtml(sec)}${ctaHtml(sec)}
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 ${bgPat}">
        <div className="section-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-8 rounded-2xl bg-slate-800/80 border border-${p}-500/20">
              <h2 className="text-2xl font-bold text-white mb-4">${esc(sec.title)}</h2>
              ${listGridHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-${p}-500/10 to-${a}-500/10 border border-${p}-500/30 flex flex-col items-center justify-center">
              <span className="text-6xl mb-4">${emojis[(idx + 3) % emojis.length]}</span>
              <p className="text-${bg}-400 text-sm text-center">${esc(trunc(sec.content, 60))}</p>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/50">
        <div className="section-container">
          <div className="flex flex-col md:flex-row md:items-stretch gap-6">
            <div className="flex-1 p-8 rounded-2xl bg-slate-800/90 border-t-4 border-${p}-500">
              <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="w-full md:w-48 rounded-2xl bg-slate-800/60 border border-${a}-500/30 flex items-center justify-center shrink-0">
              <span className="text-6xl">${emojis[(idx + 5) % emojis.length]}</span>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/30">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 auto-rows-[120px]">
            <div className="col-span-2 row-span-2 p-6 rounded-2xl bg-slate-800/80 border border-${p}-500/20 flex flex-col justify-center">
              <span className="text-4xl block mb-2">${emojis[idx % emojis.length]}</span>
              <h2 className="text-lg font-bold text-white mb-1">${esc(sec.title)}</h2>
              <p className="text-${bg}-400 text-xs">${esc(trunc(sec.content, 80))}</p>
              ${sec.hasCTA ? `<div className="mt-3">${ctaSecHtml(sec)}</div>` : ''}
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 1) % emojis.length]}</span></div>
            <div className="p-4 rounded-xl bg-slate-800/60 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 2) % emojis.length]}</span></div>
            <div className="col-span-2 p-4 rounded-xl bg-slate-800/60 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 3) % emojis.length]}</span></div>
            <div className="p-4 rounded-xl bg-slate-800/60 flex items-center justify-center"><span className="text-3xl">${emojis[(idx + 4) % emojis.length]}</span></div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 ${bgPat}">
        <div className="section-container max-w-4xl mx-auto">
          <div className="p-8 md:p-12 rounded-3xl bg-slate-800/80 border-2 border-${p}-500/30 shadow-xl shadow-${p}-500/10">
            <div className="flex items-start gap-6">
              <span className="text-5xl flex-shrink-0 ${anim}">${emojis[(idx + 7) % emojis.length]}</span>
              <div>
                <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
                ${listHtml(sec)}${ctaHtml(sec)}
              </div>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/60">
        <div className="section-container">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-${p}-500/20">
              <h2 className="text-2xl font-bold text-white mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-${a}-500/20">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">${emojis[(idx + 9) % emojis.length]}</span>
                <p className="text-${bg}-300">${esc(trunc(sec.content, 100))}</p>
              </div>
              ${sec.hasCTA ? ctaSecHtml(sec) : ''}
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-800/40">
        <div className="section-container">
          <div className="flex flex-wrap -mx-4">
            <div className="w-full lg:w-2/3 px-4">
              <div className="p-8 rounded-2xl bg-slate-800/90 border-r-4 border-${p}-500">
                <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
                ${listHtml(sec)}${ctaHtml(sec)}
              </div>
            </div>
            <div className="w-full lg:w-1/3 px-4 mt-6 lg:mt-0 flex items-center justify-center">
              <div className="rounded-2xl bg-${p}-500/20 p-8 border border-${p}-500/40">
                <span className="text-6xl block">${emojis[(idx + 11) % emojis.length]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 ${bgPat}">
        <div className="section-container">
          <div className="max-w-2xl">
            <div className="border-l-4 border-${p}-500 pl-8 py-4">
              <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
          </div>
        </div>
      </section>`,
      (sec) => `<section className="py-16 bg-slate-900/50">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 p-8 rounded-2xl bg-slate-800/80 border border-${p}-500/20">
              <span className="text-4xl block mb-4">${emojis[idx % emojis.length]}</span>
              <h2 className="text-2xl font-bold text-white mb-4">${esc(sec.title)}</h2>
              ${listHtml(sec)}${ctaHtml(sec)}
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-800/60 border border-${p}-500/20 flex items-center justify-center"><span className="text-4xl">${emojis[(idx + 1) % emojis.length]}</span></div>
              <div className="rounded-xl bg-slate-800/60 border border-${a}-500/20 flex items-center justify-center"><span className="text-4xl">${emojis[(idx + 2) % emojis.length]}</span></div>
            </div>
          </div>
        </div>
      </section>`
    ];
      const templateIdx = Math.floor((layoutSeed * 31 + i * 17 + idx * 7) % sectionTemplates.length);
      return sectionTemplates[templateIdx](sec);
    }).join('\n');
  }

  const heroVariant = layoutSeed % 5;
  const heroAnimClass = ['animate-fade-in', 'animate-scale-in', 'animate-slide-up', 'animate-fade-in', 'animate-scale-in'][heroVariant];
  const heroGradients = [
    `bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent`,
    `bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900`,
    `bg-gradient-to-tr from-slate-900/95 via-${p}-900/40 to-transparent`,
    `bg-gradient-to-bl from-${p}-900/50 via-slate-900/80 to-slate-900`,
    `bg-gradient-to-r from-slate-900 via-slate-900/50 to-${a}-900/30`
  ];
  const heroDecorators = [
    `<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-${p}-500/10 via-transparent to-transparent"></div>`,
    `<div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-${p}-500/5 blur-3xl"></div><div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-${a}-500/5 blur-3xl"></div>`,
    `<div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(251,191,36,0.05)_60%,transparent_80%)]"></div>`,
    `<div className="absolute top-20 right-20 w-32 h-32 border border-${p}-500/20 rounded-full animate-pulse"></div><div className="absolute bottom-20 left-20 w-48 h-48 border border-${a}-500/10 rounded-full animate-float"></div>`,
    `<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(251,191,36,0.08)_0%,transparent_50%)]"></div>`
  ];
  const heroLayouts = [
    `<div className="section-container relative z-10 py-20"><div className="max-w-2xl ${heroAnimClass}"><h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">${heroTitle}</h1><p className="text-xl text-${bg}-200 mb-10 leading-relaxed">${heroSub}</p><div className="flex flex-wrap gap-4"><CTAButton text="${ctaText}" /><CTAButton text="Learn More" variant="secondary" /></div></div></div>`,
    `<div className="section-container relative z-10 py-20 text-center"><div className="max-w-3xl mx-auto ${heroAnimClass}"><h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">${heroTitle}</h1><p className="text-xl text-${bg}-200 mb-10 leading-relaxed max-w-2xl mx-auto">${heroSub}</p><div className="flex flex-wrap gap-4 justify-center"><CTAButton text="${ctaText}" /><CTAButton text="Learn More" variant="secondary" /></div></div></div>`,
    `<div className="section-container relative z-10 py-20"><div className="grid lg:grid-cols-2 gap-12 items-center"><div className="${heroAnimClass}"><h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">${heroTitle}</h1><p className="text-lg text-${bg}-200 mb-8 leading-relaxed">${heroSub}</p><div className="flex flex-wrap gap-4"><CTAButton text="${ctaText}" /><CTAButton text="Learn More" variant="secondary" /></div></div><div className="hidden lg:flex items-center justify-center"><span className="text-8xl animate-float">${emojis[layoutSeed % emojis.length]}</span></div></div></div>`,
    `<div className="section-container relative z-10 py-24"><div className="max-w-xl ${heroAnimClass}"><span className="text-6xl block mb-6 animate-wiggle">${emojis[(layoutSeed + 3) % emojis.length]}</span><h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">${heroTitle}</h1><p className="text-lg text-${bg}-200 mb-8 leading-relaxed">${heroSub}</p><CTAButton text="${ctaText}" /></div></div>`,
    `<div className="section-container relative z-10 py-20 text-center"><div className="${heroAnimClass}"><div className="inline-block px-6 py-2 rounded-full border border-${p}-500/30 text-${p}-400 text-sm font-semibold mb-6 animate-shimmer">${emojis[layoutSeed % emojis.length]} ${esc(pageName)} ${emojis[(layoutSeed + 1) % emojis.length]}</div><h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">${heroTitle}</h1><p className="text-xl text-${bg}-200 mb-10 leading-relaxed max-w-2xl mx-auto">${heroSub}</p><div className="flex flex-wrap gap-4 justify-center"><CTAButton text="${ctaText}" /><CTAButton text="Learn More" variant="secondary" /></div></div></div>`
  ];

  const heroBlock = `
      <section className="relative min-h-[550px] flex items-center overflow-hidden">
        ${imgTag ? `<div className="absolute inset-0">${imgTag} /><div className="absolute inset-0 ${heroGradients[heroVariant]}"></div></div>` : `<div className="absolute inset-0 bg-gradient-to-br from-${p}-800 via-slate-900 to-${a}-900"></div>`}
        ${heroDecorators[heroVariant]}
        ${heroLayouts[heroVariant]}
      </section>`;

  const statsVariant = layoutSeed % 3;
  const statsStyles = [
    `py-14 bg-gradient-to-r from-${p}-600/20 via-slate-800 to-${a}-600/20 border-y border-${p}-500/20`,
    `py-14 bg-slate-800/80 border-y border-${p}-500/30`,
    `py-16 bg-gradient-to-b from-slate-900 to-slate-800/50`
  ];
  const statsCardStyles = [
    (val, label) => `<div><p className="text-4xl font-extrabold text-${p}-400">${val}</p><p className="text-${bg}-400 mt-1">${label}</p></div>`,
    (val, label) => `<div className="p-4 rounded-xl border border-${p}-500/20 bg-slate-800/60"><p className="text-3xl font-extrabold text-${p}-400">${val}</p><p className="text-${bg}-400 mt-1 text-sm">${label}</p></div>`,
    (val, label) => `<div className="flex flex-col items-center"><p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-${p}-400 to-${a}-400">${val}</p><p className="text-${bg}-400 mt-2">${label}</p></div>`
  ];
  const statsFn = statsCardStyles[statsVariant];
  const statsBlock = `
      <section className="${statsStyles[statsVariant]}">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            ${statsFn('1500+', 'Games')}
            ${statsFn('90s', 'Withdrawal')}
            ${statsFn('250%', 'Welcome Bonus')}
            ${statsFn('24/7', 'Support')}
          </div>
        </div>
      </section>`;

  let body = '';

  switch (layout) {

    case 'casino-home': {
      const homeVariant = layoutSeed % 5;
      const homeGrids = [
        `grid md:grid-cols-3 gap-8`,
        `grid sm:grid-cols-2 lg:grid-cols-4 gap-6`,
        `grid lg:grid-cols-2 gap-8`,
        `grid sm:grid-cols-2 lg:grid-cols-3 gap-6`,
        `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6`
      ];
      const homeTake = [3, 4, 2, 4, 5][homeVariant];
      const cardAnims = ['animate-float', 'animate-wiggle', 'animate-pulse', 'animate-bounce', 'animate-glow'];
      const cardStyles = [
        (i) => `group p-8 rounded-2xl border border-${p}-500/20 bg-slate-800/80 hover:border-${p}-400 hover:shadow-xl hover:shadow-${p}-500/20 transition-all duration-300 hover:-translate-y-2`,
        (i) => `group p-6 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-800/60 border border-${p}-500/20 hover:border-${p}-400/60 hover:shadow-2xl transition-all duration-300`,
        (i) => `group p-8 rounded-2xl bg-slate-800/90 border-l-4 border-${p}-500 hover:bg-slate-800 transition-all duration-300`,
        (i) => `group p-6 rounded-2xl bg-gradient-to-b from-${p}-500/10 to-transparent border border-${p}-500/30 hover:shadow-xl hover:shadow-${p}-500/20 transition-all duration-500 hover:scale-[1.02]`,
        (i) => `group p-8 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-${a}-500 hover:shadow-lg transition-all duration-300`
      ];
      const cardStyle = cardStyles[homeVariant];
      body = `${heroBlock}
      ${statsBlock}

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <h2 className="text-3xl font-bold text-center text-${p}-400 mb-12">What We Offer</h2>
          <div className="${homeGrids[homeVariant]}">
            ${secs.slice(0, homeTake).map((sec, i) => `
            <div className="${cardStyle(i)}">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-${p}-500 to-${a}-600 flex items-center justify-center mb-5 text-2xl ${cardAnims[(layoutSeed + i) % cardAnims.length]}" style={{ animationDelay: '${i * 200}ms' }}>
                ${emojis[i % emojis.length]}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">${esc(sec.title)}</h3>
              <p className="text-${bg}-300 leading-relaxed">${esc(trunc(sec.content))}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>

      ${secs.length > homeTake ? renderSections(secs.slice(homeTake), homeTake) : ''}

      ${imgTag ? `
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">${imgTag} /><div className="absolute inset-0 bg-slate-900/80"></div></div>
        <div className="section-container relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Join Thousands of Winners</h2>
          <p className="text-${bg}-300 max-w-2xl mx-auto mb-8">Start playing today and experience world-class casino entertainment.</p>
          <CTAButton text="${ctaText}" />
        </div>
      </section>` : ''}

      ${bottomCTA(p, a, bg, ctaText)}`;
      break;
    }

    case 'casino-games': {
      const gamesVariant = (layoutSeed + 1) % 5;
      const gamesGrids = [
        `grid sm:grid-cols-2 lg:grid-cols-3 gap-6`,
        `grid grid-cols-2 md:grid-cols-4 gap-4`,
        `grid sm:grid-cols-2 lg:grid-cols-4 gap-5`,
        `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4`,
        `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6`
      ];
      const gamesTake = [6, 8, 4, 6, 4][gamesVariant];
      body = `${heroBlock}

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <h2 className="text-3xl font-bold text-center text-${p}-400 mb-4">Explore Our Games</h2>
          <p className="text-${bg}-400 text-center max-w-2xl mx-auto mb-12">${esc(secs[0]?.content?.substring?.(0, 200) || '')}</p>
          <div className="${gamesGrids[gamesVariant]}">
            ${secs.slice(0, gamesTake).map((sec, i) => {
              const gameCardAnims = ['group-hover:scale-125 group-hover:rotate-12', 'group-hover:scale-110', 'group-hover:scale-125 animate-float', 'group-hover:scale-110 animate-pulse'];
              const gameAnim = gameCardAnims[(layoutSeed + i) % gameCardAnims.length];
              return `
            <div className="group bg-slate-800 rounded-2xl overflow-hidden border border-${p}-500/20 hover:border-${p}-400/50 hover:shadow-2xl hover:shadow-${p}-500/20 transition-all duration-300 hover:-translate-y-1">
              <div className="h-40 bg-gradient-to-br from-${p}-600/30 to-${a}-600/30 flex items-center justify-center overflow-hidden">
                <span className="text-5xl ${gameAnim} transition-transform duration-500">${emojis[i % emojis.length]}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-2">${esc(sec.title)}</h3>
                <p className="text-${bg}-400 leading-relaxed line-clamp-3">${esc(trunc(sec.content, 110))}</p>
                <div className="mt-4"><CTAButton text="Play Now" variant="secondary" /></div>
              </div>
            </div>`;
            }).join('')}
          </div>
        </div>
      </section>

      ${secs.length > gamesTake ? renderSections(secs.slice(gamesTake), gamesTake) : ''}

      ${statsBlock}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;
    }

    case 'casino-bonuses': {
      const bonusVariant = (layoutSeed + 2) % 3;
      const bonusGrids = [
        `grid md:grid-cols-2 lg:grid-cols-3 gap-6`,
        `grid sm:grid-cols-2 gap-8`,
        `grid grid-cols-1 md:grid-cols-4 gap-4`
      ];
      const bonusTake = [6, 4, 4][bonusVariant];
      body = `
      <section className="relative min-h-[500px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-${p}-800 via-slate-900 to-${a}-900"></div>
        ${imgTag ? `<div className="absolute inset-0 opacity-30">${imgTag} /></div>` : ''}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(251,191,36,0.15) 0%, transparent 50%)' }}></div>
        <div className="section-container relative z-10 py-20 text-center">
          <span className="text-6xl block mb-6 animate-float">🎁</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6">${heroTitle}</h1>
          <p className="text-xl text-${bg}-200 mb-10 max-w-2xl mx-auto">${heroSub}</p>
          <CTAButton text="${ctaText}" />
        </div>
      </section>

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <div className="${bonusGrids[bonusVariant]}">
            ${secs.slice(0, bonusTake).map((sec, i) => {
              const bonusCardStyles = [
                `bg-gradient-to-b from-slate-800 to-slate-800/50 p-8 rounded-2xl border border-${p}-500/20 hover:border-${p}-400/60 transition-all group`,
                `bg-slate-800/80 p-8 rounded-2xl border-l-4 border-${p}-500 hover:bg-slate-800 transition-all group`,
                `bg-gradient-to-br from-${p}-500/10 to-${a}-500/5 p-8 rounded-2xl border border-${p}-500/30 hover:shadow-xl hover:shadow-${p}-500/20 transition-all group hover:-translate-y-1`,
                `bg-slate-800/90 p-8 rounded-2xl border border-slate-600 hover:border-${a}-500 transition-all group`,
                `bg-gradient-to-r from-slate-800 to-slate-800/60 p-8 rounded-2xl border-2 border-${p}-500/20 hover:border-${p}-400/50 transition-all group`,
                `bg-slate-800/70 p-8 rounded-3xl border border-${p}-500/20 shadow-lg hover:shadow-${p}-500/10 transition-all group`
              ];
              return `
            <div className="${bonusCardStyles[i % bonusCardStyles.length]}">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">${emojis[(i + 4) % emojis.length]}</span>
                <h3 className="text-lg font-bold text-white">${esc(sec.title)}</h3>
              </div>
              <p className="text-${bg}-300 leading-relaxed line-clamp-4">${esc(trunc(sec.content, 120))}</p>
              ${sec.hasCTA ? `<div className="mt-5"><CTAButton text="Claim Now" variant="secondary" /></div>` : ''}
            </div>`;
            }).join('')}
          </div>
        </div>
      </section>

      ${secs.length > bonusTake ? renderSections(secs.slice(bonusTake), bonusTake) : ''}

      ${statsBlock}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;
    }

    case 'casino-app':
      body = `${heroBlock}

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">${esc(secs[0]?.title || 'Download the App')}</h2>
              <p className="text-${bg}-300 leading-relaxed mb-8">${esc(secs[0]?.content || '')}</p>
              <div className="space-y-4">
                ${['Download APK from official site', 'Enable Unknown Sources on Android', 'Install and log in', 'Start playing 500+ games instantly'].map((step, i) => `
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-${p}-500 to-${a}-600 flex items-center justify-center text-white font-bold flex-shrink-0">${i + 1}</div>
                  <div className="pt-2 text-${bg}-300">${step}</div>
                </div>`).join('')}
              </div>
              <div className="mt-8"><CTAButton text="Download Now" /></div>
            </div>
            <div className="flex justify-center">
              <div className="w-64 h-[500px] bg-gradient-to-b from-${p}-500/20 to-${a}-500/20 rounded-[3rem] border-4 border-${p}-500/30 flex items-center justify-center shadow-2xl shadow-${p}-500/20">
                ${imgTag ? `<div className="w-56 h-[460px] rounded-[2.5rem] overflow-hidden">${imgTag} /></div>` : `<span className="text-6xl animate-float">📱</span>`}
              </div>
            </div>
          </div>
        </div>
      </section>

      ${secs.length > 1 ? `
      <section className="py-16 bg-slate-900/60">
        <div className="section-container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${secs.slice(1, 5).map((sec, i) => {
              const appCardStyles = [
                `text-center p-6 rounded-2xl bg-slate-800/50 border border-${p}-500/20 hover:border-${p}-400/50 transition-all hover:-translate-y-1 duration-300`,
                `text-center p-6 rounded-2xl bg-gradient-to-b from-${p}-500/10 to-slate-800/80 border border-${p}-500/30`,
                `text-center p-6 rounded-2xl bg-slate-800/80 border-t-4 border-${a}-500 shadow-lg`,
                `text-center p-6 rounded-2xl bg-slate-800/60 border border-slate-600 hover:shadow-xl hover:shadow-${p}-500/10 transition-all`
              ];
              return `
            <div className="${appCardStyles[i % 4]}">
              <span className="text-3xl block mb-3">${['📱', '🔒', '🎮', '💳'][i % 4]}</span>
              <h3 className="font-bold text-white mb-2">${esc(sec.title)}</h3>
              <p className="text-${bg}-400 line-clamp-3">${esc(trunc(sec.content, 100))}</p>
            </div>`;
            }).join('')}
          </div>
        </div>
      </section>` : ''}

      ${secs.length > 5 ? renderSections(secs.slice(5), 5) : ''}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'casino-aviator':
      body = `
      <section className="relative min-h-[550px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-${p}-900/50 to-slate-900"></div>
        ${imgTag ? `<div className="absolute inset-0 opacity-40">${imgTag} /></div>` : ''}
        <div className="section-container relative z-10 py-20 text-center">
          <span className="text-7xl block mb-6 animate-float">✈️</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6">${heroTitle}</h1>
          <p className="text-xl text-${bg}-200 mb-10 max-w-2xl mx-auto">${heroSub}</p>
          <div className="flex justify-center gap-4">
            <CTAButton text="${ctaText}" />
            <CTAButton text="How to Play" variant="secondary" />
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-800/50">
        <div className="section-container">
          <div className="grid md:grid-cols-4 gap-6">
            ${[{ val: '97%', label: 'RTP Rate' }, { val: '100x+', label: 'Max Multiplier' }, { val: '5s', label: 'Per Round' }, { val: '24/7', label: 'Available' }].map(s => `
            <div className="text-center p-6 rounded-2xl bg-slate-800 border border-${p}-500/20">
              <p className="text-3xl font-extrabold text-${p}-400">${s.val}</p>
              <p className="text-${bg}-400 mt-1 text-sm">${s.label}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900/60">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">How to Play</h2>
              ${secs.slice(0, 3).map((sec, i) => {
                const stepStyles = [
                  `w-12 h-12 rounded-full bg-${p}-500 text-white flex items-center justify-center font-bold flex-shrink-0`,
                  `w-12 h-12 rounded-xl bg-gradient-to-br from-${p}-500 to-${a}-600 text-white flex items-center justify-center font-bold flex-shrink-0`,
                  `w-12 h-12 rounded-full border-2 border-${p}-400 text-${p}-400 flex items-center justify-center font-bold flex-shrink-0`
                ];
                return `
              <div className="flex gap-4 mb-6">
                <div className="${stepStyles[i % 3]}">${i + 1}</div>
                <div>
                  <h3 className="font-bold text-white">${esc(sec.title)}</h3>
                  <p className="text-${bg}-300 mt-1">${esc(sec.content)}</p>
                </div>
              </div>`;
              }).join('')}
            </div>
            <div className="bg-gradient-to-br from-${p}-500/10 to-${a}-500/10 rounded-2xl aspect-video flex items-center justify-center border border-${p}-500/20">
              ${imgTag ? `<div className="w-full h-full rounded-2xl overflow-hidden">${imgTag} /></div>` : `<span className="text-8xl animate-float">✈️</span>`}
            </div>
          </div>
        </div>
      </section>

      ${secs.length > 3 ? renderSections(secs.slice(3), 3) : ''}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'casino-betting': {
      const sportCards = [
        { key: 'cricket', emoji: '🏏', name: 'Cricket', desc: 'IPL, T20, Ashes' },
        { key: 'football', emoji: '⚽', name: 'Football', desc: 'Premier League, UCL' },
        { key: 'esports', emoji: '🎮', name: 'eSports', desc: 'PUBG, Valorant, FIFA' },
        { key: 'other', emoji: '🏀', name: 'More Sports', desc: 'Tennis, NBA, Kabaddi' }
      ];
      const bettingVariant = layoutSeed % 3;
      body = `${heroBlock}

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <h2 className="text-3xl font-bold text-center text-${p}-400 mb-12">Sports & eSports</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${sportCards.map((s, i) => {
              const sportImg = sportImages[s.key];
              return `
            <div className="bg-slate-800 rounded-2xl border border-${p}-500/20 hover:border-${p}-400/50 transition-all group overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-${p}-500/20 duration-300">
              ${sportImg ? `<div className="h-40 overflow-hidden"><img src="${sportImg}" alt="${s.name}" data-site="${siteUrl}" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div>` : `<div className="h-40 bg-gradient-to-br from-${p}-600/30 to-${a}-600/30 flex items-center justify-center"><span className="text-5xl group-hover:scale-125 transition-transform duration-300">${s.emoji}</span></div>`}
              <div className="p-6 text-center">
                <h3 className="font-bold text-white text-lg mb-1">${s.name}</h3>
                <p className="text-${bg}-400 text-sm mb-4">${s.desc}</p>
                <CTAButton text="Bet Now" variant="secondary" />
              </div>
            </div>`;
            }).join('')}
          </div>
        </div>
      </section>

      ${secs.length > 0 ? renderSections(secs.slice(0, 4), 0) : ''}

      ${secs.length > 4 ? renderSections(secs.slice(4), 4) : ''}
      ${statsBlock}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;
    }

    case 'casino-timeline':
      body = `
      <section className="relative min-h-[500px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-${p}-900/80 via-slate-900 to-slate-900"></div>
        ${imgTag ? `<div className="absolute inset-0 opacity-25">${imgTag} /></div>` : ''}
        <div className="section-container relative z-10 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6">${heroTitle}</h1>
          <p className="text-xl text-${bg}-200 mb-10 max-w-2xl mx-auto">${heroSub}</p>
          <CTAButton text="${ctaText}" />
        </div>
      </section>

      <section className="py-20 bg-slate-800/50">
        <div className="section-container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-${p}-400 mb-16">How It Works</h2>
          <div className="space-y-0">
            ${secs.slice(0, 6).map((sec, i) => `
            <div className="flex gap-8 items-start ${i % 2 === 1 ? 'flex-row-reverse' : ''}">
              <div className="flex-1 ${i % 2 === 1 ? 'text-right' : ''}">
                <div className="inline-block p-6 rounded-2xl bg-slate-800/90 border border-${p}-500/20 hover:border-${p}-400/50 transition-all">
                  <span className="text-3xl block mb-2">${emojis[(i + 3) % emojis.length]}</span>
                  <h3 className="text-xl font-bold text-white mb-2">${esc(sec.title)}</h3>
                  <p className="text-${bg}-300 text-sm leading-relaxed">${esc(trunc(sec.content, 140))}</p>
                </div>
              </div>
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-${p}-500 border-4 border-slate-900 mt-6 animate-pulse"></div>
              <div className="flex-1 ${i % 2 === 1 ? 'text-left' : 'text-right'}"></div>
            </div>`).join('')}
          </div>
        </div>
      </section>

      ${secs.length > 6 ? renderSections(secs.slice(6), 6) : ''}
      ${statsBlock}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'casino-bento':
      body = `
      <section className="relative min-h-[500px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-${a}-900/50 via-slate-900 to-${p}-900/50"></div>
        ${imgTag ? `<div className="absolute inset-0 opacity-30">${imgTag} /></div>` : ''}
        <div className="section-container relative z-10 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6">${heroTitle}</h1>
          <p className="text-xl text-${bg}-200 mb-10 max-w-2xl mx-auto">${heroSub}</p>
          <CTAButton text="${ctaText}" />
        </div>
      </section>

      <section className="py-20 bg-slate-900/60">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[140px]">
            ${secs.slice(0, 8).map((sec, i) => {
              const sizes = ['col-span-2 row-span-2', 'col-span-1 row-span-1', 'col-span-2 row-span-1', 'col-span-1 row-span-2', 'col-span-2 row-span-2', 'col-span-1 row-span-1', 'col-span-2 row-span-1', 'col-span-1 row-span-2'];
              const size = sizes[i % sizes.length];
              return `
            <div className="${size} p-5 rounded-2xl bg-slate-800/80 border border-${p}-500/20 hover:border-${p}-400/50 transition-all flex flex-col justify-center group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">${emojis[i % emojis.length]}</span>
              <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">${esc(sec.title)}</h3>
              <p className="text-${bg}-400 text-xs line-clamp-2">${esc(trunc(sec.content, 60))}</p>
              ${sec.hasCTA && i === Math.min(7, secs.length - 1) ? `<div className="mt-2"><CTAButton text="${ctaText}" variant="secondary" /></div>` : ''}
            </div>`;
            }).join('')}
          </div>
        </div>
      </section>

      ${secs.length > 8 ? renderSections(secs.slice(8), 8) : ''}
      ${statsBlock}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'casino-login':
      body = `
      <section className="py-16 bg-gradient-to-b from-${p}-800 via-slate-900 to-slate-900 text-white">
        <div className="section-container text-center max-w-2xl mx-auto">
          <span className="text-5xl block mb-4">🔒</span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">${heroTitle}</h1>
          <p className="text-lg text-${bg}-200">${heroSub}</p>
        </div>
      </section>

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="bg-slate-800 rounded-2xl p-8 border border-${p}-500/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-medium text-${bg}-300 mb-1">Email or Username</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700 text-white outline-none focus:border-${p}-500" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-${bg}-300 mb-1">Password</label>
                  <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700 text-white outline-none focus:border-${p}-500" placeholder="••••••••" />
                </div>
                <CTAButton text="Log In" className="w-full text-center" />
                <p className="text-center text-${bg}-400 text-sm">Don't have an account? <a href="${offerUrl}" className="text-${p}-400 hover:underline">Sign Up</a></p>
              </form>
            </div>
            <div className="space-y-6">
              ${secs.slice(0, 4).map((sec, i) => {
                const loginCardStyles = [
                  `flex gap-4 p-5 bg-slate-800/60 rounded-xl border border-slate-700/50`,
                  `flex gap-4 p-5 bg-gradient-to-r from-${p}-500/10 to-transparent rounded-xl border-l-4 border-${p}-500`,
                  `flex gap-4 p-5 bg-slate-800/80 rounded-2xl border border-${p}-500/20 hover:border-${p}-400/50 transition-all`,
                  `flex gap-4 p-5 bg-slate-800/40 rounded-xl border border-slate-600 shadow-lg`
                ];
                return `
              <div className="${loginCardStyles[i % 4]}">
                <span className="text-2xl flex-shrink-0">${['🔒', '⚡', '🎁', '📱'][i % 4]}</span>
                <div>
                  <h3 className="font-bold text-white mb-1">${esc(sec.title)}</h3>
                  <p className="text-${bg}-400 leading-relaxed line-clamp-3">${esc(trunc(sec.content, 120))}</p>
                </div>
              </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </section>

      ${secs.length > 4 ? renderSections(secs.slice(4), 4) : ''}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'contact-cards':
      body = `
      <section className="py-16 bg-gradient-to-r from-${p}-600 to-${a}-600 text-white">
        <div className="section-container text-center max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">${heroTitle}</h1>
          <p className="text-lg text-${p}-100">${heroSub}</p>
        </div>
      </section>

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-${bg}-300 mb-1">Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white outline-none focus:border-${p}-500" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-${bg}-300 mb-1">Email</label>
                    <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white outline-none focus:border-${p}-500" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-${bg}-300 mb-1">Message</label>
                  <textarea rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white outline-none focus:border-${p}-500 resize-y" placeholder="Your message..."></textarea>
                </div>
                <CTAButton text="Send Message" />
              </form>
            </div>
            <div className="lg:col-span-2 space-y-6">
              ${imgTag ? `<div className="rounded-2xl overflow-hidden shadow-lg aspect-video mb-6">${imgTag} /></div>` : ''}
              ${[
                { icon: '📧', title: 'Email', text: `info@${domain}` },
                { icon: '📞', title: 'Phone', text: '+1 (800) 123-4567' },
                { icon: '💬', title: 'Live Chat', text: 'Available 24/7' },
                { icon: '🕐', title: 'Hours', text: 'Always Open' }
              ].map(c => `
              <div className="flex gap-4 p-5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-2xl">${c.icon}</span>
                <div>
                  <h4 className="font-bold text-white">${c.title}</h4>
                  <p className="text-${bg}-400 text-sm">${c.text}</p>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </section>

      ${secs.length > 0 ? renderSections(secs, 0) : ''}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'casino-sections':
      body = `${heroBlock}
      ${statsBlock}
      ${renderSections(secs, 0)}
      ${imgTag ? `
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">${imgTag} /><div className="absolute inset-0 bg-slate-900/80"></div></div>
        <div className="section-container relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Join Thousands of Winners</h2>
          <p className="text-${bg}-300 max-w-2xl mx-auto mb-8">Start playing today and experience world-class casino entertainment.</p>
          <CTAButton text="${ctaText}" />
        </div>
      </section>` : ''}
      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    case 'accordion':
      body = `
      <section className="py-16 bg-gradient-to-br from-${p}-700 to-${a}-800 text-white">
        <div className="section-container text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">${heroTitle}</h1>
          <p className="text-lg text-${p}-100">${heroSub}</p>
        </div>
      </section>

      <section className="py-20 bg-slate-800/50">
        <div className="section-container max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3 space-y-4">
              ${secs.map((sec, i) => `
              <details className="group bg-slate-800 rounded-xl border border-${p}-500/20 overflow-hidden" ${i === 0 ? 'open' : ''}>
                <summary className="flex items-center justify-between p-6 cursor-pointer font-bold text-white hover:text-${p}-400">
                  <span>${esc(sec.title)}</span>
                  <span className="text-${p}-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <div className="px-6 pb-6 text-${bg}-300 leading-relaxed">${esc(sec.content)}</div>
              </details>`).join('')}
            </div>
            <div className="lg:col-span-2">
              ${imgTag ? `<div className="rounded-2xl overflow-hidden shadow-lg sticky top-24">${imgTag} /></div>` : `
              <div className="bg-slate-800 rounded-2xl p-8 sticky top-24 text-center border border-${p}-500/20">
                <span className="text-5xl block mb-4">❓</span>
                <h3 className="font-bold text-white mb-2">Need Help?</h3>
                <p className="text-${bg}-400 mb-4">Contact our 24/7 support team.</p>
                <CTAButton text="Contact Us" />
              </div>`}
            </div>
          </div>
        </div>
      </section>

      ${bottomCTA(p, a, bg, ctaText)}`;
      break;

    default:
      body = `${heroBlock}

      <section className="py-20 bg-slate-800/50">
        <div className="section-container">
          ${secs.length >= 3 ? `
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            ${secs.slice(0, 3).map((sec, i) => `
            <div className="p-8 rounded-2xl border border-${p}-500/20 bg-slate-800/80 hover:border-${p}-400/50 transition-all">
              <span className="text-3xl block mb-4">${emojis[i % emojis.length]}</span>
              <h3 className="text-xl font-bold text-white mb-3">${esc(sec.title)}</h3>
              <p className="text-${bg}-300 leading-relaxed">${esc(sec.content)}</p>
            </div>`).join('')}
          </div>` : ''}
          ${secs.length > 3 || secs.length < 3 ? secs.slice(secs.length >= 3 ? 3 : 0).map((sec, i) => `
          <div className="max-w-4xl mx-auto mb-12 bg-slate-800/60 rounded-2xl p-8 border border-${p}-500/10">
            <h2 className="text-2xl font-bold text-${p}-400 mb-4">${esc(sec.title)}</h2>
            <p className="text-${bg}-300 leading-relaxed">${esc(sec.content)}</p>
            ${sec.hasCTA ? `<div className="mt-6"><CTAButton text="${ctaText}" variant="secondary" /></div>` : ''}
          </div>`).join('') : ''}
        </div>
      </section>

      ${statsBlock}
      ${bottomCTA(p, a, bg, ctaText)}`;
  }

  const gameGridBlock = includeGameGrid ? '\n      <GameGrid />' : '';
  const gameGridImport = includeGameGrid ? "import GameGrid from '../components/GameGrid';\n" : '';
  let finalBody = body;
  if (includeGameGrid) {
    const idx = body.lastIndexOf('<section className="py-20 bg-gradient-to-r');
    if (idx > 0) finalBody = body.slice(0, idx) + gameGridBlock + '\n      ' + body.slice(idx);
    else finalBody = body + gameGridBlock;
  }

  return `${gameGridImport}import SEOHead from '../components/SEOHead';
import CTAButton from '../components/CTAButton';

export default function ${componentName}() {
  return (
    <>${seoBlock}
${finalBody}
    </>
  );
}
`;
}

function bottomCTA(p, a, bg, ctaText) {
  return `
      <section className="py-20 bg-gradient-to-r from-${p}-600 via-${p}-700 to-${a}-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 animate-pulse opacity-20 bg-white/10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-${p}-400/20 blur-3xl animate-pulse"></div>
        <div className="section-container text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 drop-shadow-lg">Ready to Play?</h2>
          <p className="text-xl text-${p}-100 mb-8 max-w-2xl mx-auto">
            Join thousands of winners. Claim your bonus and spin the reels today!
          </p>
          <CTAButton text="${ctaText}" />
        </div>
      </section>`;
}

// ── Helpers ────────────────────────────────────────────────────────

function splitContentToSections(text, pageName) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const sections = [];
  const chunkSize = Math.max(2, Math.ceil(sentences.length / 3));

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(' ');
    sections.push({
      title: extractSectionTitle(chunk, i),
      content: chunk,
      hasCTA: i === 0 || i >= sentences.length - chunkSize
    });
  }

  return sections.length ? sections : [{ title: 'Welcome', content: text, hasCTA: true }];
}

function extractSectionTitle(text, index) {
  const titles = ['Our Story', 'What We Offer', 'Why Choose Us', 'Get Started', 'Our Mission', 'Learn More'];
  return titles[index % titles.length];
}

function toComponentName(pageName) {
  return pageName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

const INDEX_PAGES = ['casino', 'home'];

function toSlug(pageName, indexPage = null) {
  const key = pageName.toLowerCase().trim().replace(/\s+/g, '-');
  const isIndex = indexPage && pageName.toLowerCase().trim() === indexPage.toLowerCase().trim();
  return isIndex ? '/' : `/${key}`;
}

function escapeJsx(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ── Config files ──────────────────────────────────────────────────

function writeConfigFiles(root, brand, projectName, fontSet) {
  root.file('package.json', JSON.stringify({
    name: projectName,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: {
      'react': '^18.3.1', 'react-dom': '^18.3.1',
      'react-router-dom': '^6.28.0', 'react-helmet-async': '^2.0.5'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.4', 'vite': '^6.0.0',
      'tailwindcss': '^3.4.17', 'postcss': '^8.4.49', 'autoprefixer': '^10.4.20'
    }
  }, null, 2));

  root.file('vite.config.js', `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n`);
  const animKeyframes = `ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        shimmer: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.8' } },
        bounce: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        glow: { '0%, 100%': { filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))' }, '50%': { filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8))' } },
        'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        wiggle: { '0%, 100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(-3deg)' }, '75%': { transform: 'rotate(3deg)' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.9)' }, to: { opacity: '1', transform: 'scale(1)' } }`;
  root.file('tailwind.config.js', `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,jsx}'],\n  theme: {\n    extend: {\n      fontFamily: { sans: [${fontSet?.family ? `'${fontSet.family.split("'")[1]}'` : "'Poppins'"}, 'sans-serif'] },\n      animation: {\n        ticker: 'ticker 30s linear infinite',\n        shimmer: 'shimmer 2s ease-in-out infinite',\n        float: 'float 3s ease-in-out infinite',\n        'slide-up': 'slide-up 0.6s ease-out',\n        pulse: 'pulse 2s ease-in-out infinite',\n        bounce: 'bounce 1s ease-in-out infinite',\n        glow: 'glow 2s ease-in-out infinite',\n        'spin-slow': 'spin-slow 8s linear infinite',\n        wiggle: 'wiggle 1s ease-in-out infinite',\n        'fade-in': 'fade-in 0.7s ease-out both',\n        'scale-in': 'scale-in 0.5s ease-out both'\n      },\n      keyframes: { ${animKeyframes} }\n    }\n  },\n  plugins: []\n};\n`);
  root.file('postcss.config.js', `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`);
  root.file('index.html', `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${brand}</title>\n  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="${fontSet?.url || 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap'}" rel="stylesheet">\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n`);
  root.file('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${brand.charAt(0)}</text></svg>`);
}

// ── Source file generators ────────────────────────────────────────

function generateCSS(colors, fontSet, animSet) {
  return `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n@layer base {\n  html { scroll-behavior: smooth; font-size: 17px; }\n  body { @apply bg-${colors.bg}-900 text-${colors.bg}-100 antialiased text-base; font-family: ${fontSet?.family || "'Poppins', sans-serif"}; }\n  p, li, span { @apply text-base leading-relaxed; }\n  h1 { @apply text-4xl md:text-5xl lg:text-6xl; }\n  h2 { @apply text-2xl md:text-3xl; }\n  h3 { @apply text-lg md:text-xl; }\n}\n\n@layer components {\n  .btn-primary {\n    @apply inline-block px-8 py-3.5 bg-gradient-to-r from-${colors.primary}-500 to-${colors.accent}-500 text-white font-bold rounded-xl text-base\n           transition-all duration-300 shadow-lg shadow-${colors.primary}-500/30 hover:shadow-xl hover:shadow-${colors.primary}-500/40\n           hover:-translate-y-0.5 hover:scale-105 active:translate-y-0;\n  }\n  .btn-secondary {\n    @apply inline-block px-8 py-3.5 border-2 border-${colors.primary}-400 text-${colors.primary}-300\n           font-bold rounded-xl text-base hover:bg-${colors.primary}-500/20 hover:text-white\n           transition-all duration-300;\n  }\n  .section-container {\n    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;\n  }\n  .glow {\n    box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.1);\n  }\n}\n\n@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }\n@keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }\n@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }\n@keyframes slide-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }\n@keyframes glow { 0%, 100% { filter: drop-shadow(0 0 10px rgba(251,191,36,0.5)); } 50% { filter: drop-shadow(0 0 20px rgba(251,191,36,0.8)); } }\n@keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }\n@keyframes fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }\n@keyframes scale-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }\n`;
}

function generateMainJsx(fontSet) {
  return `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { BrowserRouter } from 'react-router-dom';\nimport { HelmetProvider } from 'react-helmet-async';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <HelmetProvider>\n      <BrowserRouter>\n        <App />\n      </BrowserRouter>\n    </HelmetProvider>\n  </React.StrictMode>\n);\n`;
}

function generateAppJsx(pages, brand, indexPage) {
  const imports = pages.map(p => `import ${toComponentName(p)} from './pages/${toComponentName(p)}';`).join('\n');
  const routes = pages.map(p => {
    const path = toSlug(p, indexPage);
    return `        <Route path="${path}" element={<${toComponentName(p)} />} />`;
  }).join('\n');
  return `import { Routes, Route } from 'react-router-dom';\nimport Header from './components/Header';\nimport Footer from './components/Footer';\nimport Ticker from './components/Ticker';\n${imports}\n\nexport default function App() {\n  return (\n    <div className="min-h-screen flex flex-col flex-wrap">\n      <main className="flex-1 w-full order-3 min-h-[60vh]"><Routes>\n${routes}\n        </Routes></main>\n      <Header />\n      <nav className="w-full order-2 shrink-0"><Ticker /></nav>\n      <aside className="w-full order-4 shrink-0" aria-hidden="true"></aside>\n      <Footer />\n    </div>\n  );\n}\n`;
}

function generateHeaderJsx(pages, brand, offerUrl, colors, indexPage, logoPath = null) {
  const p = colors.primary, bg = colors.bg;
  const navLinks = pages.map(pg => `          <Link to="${toSlug(pg, indexPage)}" className="text-${bg}-300 hover:text-${p}-400 font-semibold transition-colors">${pg}</Link>`).join('\n');
  const mobileLinks = pages.map(pg => `            <Link to="${toSlug(pg, indexPage)}" onClick={() => setOpen(false)} className="block py-2 text-${bg}-300 hover:text-${p}-400 font-semibold">${pg}</Link>`).join('\n');
  const logoEl = logoPath
    ? `<Link to="/" className="flex items-center shrink-0"><img src="${logoPath}" alt="${brand}" className="h-10 w-auto max-w-[180px] object-contain" /></Link>`
    : `<Link to="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-${p}-400 to-${p}-600 hover:from-${p}-300 hover:to-${p}-500 transition-all">${brand}</Link>`;

  return `import { useState } from 'react';\nimport { Link } from 'react-router-dom';\n\nexport default function Header() {\n  const [open, setOpen] = useState(false);\n\n  return (\n    <header className="w-full order-1 shrink-0 bg-slate-900/95 backdrop-blur-sm border-b border-${p}-500/30 sticky top-0 z-50 shadow-lg shadow-${p}-500/10">\n      <div className="section-container">\n        <div className="flex items-center justify-between h-16">\n          ${logoEl}\n          <nav className="hidden md:flex items-center gap-6">\n${navLinks}\n            <a href="${offerUrl}" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm !py-2 !px-5">Play Now</a>\n          </nav>\n          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-${p}-400" aria-label="Toggle menu">\n            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}\n            </svg>\n          </button>\n        </div>\n        {open && (\n          <nav className="md:hidden pb-4 border-t border-${p}-500/30 pt-4">\n${mobileLinks}\n            <a href="${offerUrl}" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm mt-3 text-center block">Play Now</a>\n          </nav>\n        )}\n      </div>\n    </header>\n  );\n}\n`;
}

function generateFooterJsx(pages, brand, domain, colors, indexPage, logoPath = null) {
  const p = colors.primary, bg = colors.bg;
  const links = pages.map(pg => `            <Link to="${toSlug(pg, indexPage)}" className="text-${bg}-400 hover:text-white transition-colors">${pg}</Link>`).join('\n');
  const brandEl = logoPath
    ? `<Link to="/" className="inline-block mb-3"><img src="${logoPath}" alt="${brand}" className="h-10 w-auto max-w-[160px] object-contain opacity-90 hover:opacity-100 transition-opacity" /></Link>`
    : `<h3 className="text-xl font-bold text-${p}-400 mb-3">${brand}</h3>`;

  return `import { Link } from 'react-router-dom';\n\nexport default function Footer() {\n  return (\n    <footer className="w-full order-5 shrink-0 bg-slate-950 border-t border-${p}-500/20 text-white">\n      <div className="section-container py-12">\n        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">\n          <div>\n            ${brandEl}\n            <p className="text-${bg}-400">Play responsibly. 18+ only. Visit ${domain}.</p>\n          </div>\n          <div>\n            <h4 className="font-semibold mb-3 text-${p}-300">Quick Links</h4>\n            <div className="flex flex-col gap-2">\n${links}\n            </div>\n          </div>\n          <div>\n            <h4 className="font-semibold mb-3 text-${p}-300">Contact</h4>\n            <p className="text-${bg}-400">${domain}</p>\n          </div>\n        </div>\n        <div className="border-t border-slate-700 mt-8 pt-8 text-center text-${bg}-500 text-sm">&copy; {new Date().getFullYear()} ${brand}. 18+ Play responsibly.</div>\n      </div>\n    </footer>\n  );\n}\n`;
}

function generateCTAButtonJsx(offerUrl, colors) {
  return `export default function CTAButton({ text = 'Play Now', variant = 'primary', className = '' }) {\n  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';\n  return (\n    <a href="${offerUrl}" target="_blank" rel="noopener noreferrer" className={\`\${base} \${className}\`}>\n      {text}\n    </a>\n  );\n}\n`;
}

function generateGameGridJsx(colors, gamesList, offerUrl, domain = '') {
  const p = colors.primary;
  const bg = colors.bg;
  const siteUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : '';
  const gamesJson = JSON.stringify(gamesList);
  return `const GAMES = ${gamesJson};
const SITE_URL = ${siteUrl ? `"${siteUrl}"` : '""'};

export default function GameGrid() {
  return (
    <section className="py-16 bg-slate-900/60">
      <div className="section-container">
        <h2 className="text-3xl font-bold text-center text-${p}-400 mb-10">Popular Games</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {GAMES.map((g, i) => (
            <a
              key={i}
              href="${offerUrl}"
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl overflow-hidden border border-${p}-500/20 hover:border-${p}-400 hover:shadow-2xl hover:shadow-${p}-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="aspect-square bg-slate-800 overflow-hidden relative">
                <img src={g.src} alt={g.name} data-site={SITE_URL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="bg-gradient-to-r from-${p}-500 to-${p}-600 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">Play Now</span>
                </div>
              </div>
              <div className="p-3 bg-slate-800/90">
                <p className="font-bold text-white text-sm truncate group-hover:text-${p}-400 transition-colors">{g.name}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function generateTickerJsx(colors) {
  const p = colors.primary;
  return `const RATES = [
  { pair: 'USD/RUB', value: '95.42', change: 0.12 },
  { pair: 'EUR/RUB', value: '102.18', change: -0.05 },
  { pair: 'BTC/USD', value: '43,250', change: 1.2 },
  { pair: 'ETH/USD', value: '2,280', change: 0.8 },
  { pair: 'GBP/RUB', value: '118.50', change: 0.03 },
  { pair: 'GOLD', value: '2,045', change: 0.5 },
  { pair: 'JACKPOT', value: '€125,000', change: null },
  { pair: 'BONUS', value: '100%', change: null },
  { pair: 'FREE SPINS', value: '50', change: null }
];

function TickerItem({ pair, value, change }) {
  const isUp = change !== null && change >= 0;
  return (
    <span className="flex items-center gap-2 px-4 py-1 whitespace-nowrap">
      <span className="font-bold text-${p}-400">{pair}</span>
      <span className="text-white font-semibold">{value}</span>
      {change !== null && (
        <span className={\`text-sm \${isUp ? 'text-emerald-400' : 'text-red-400'}\`}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

export default function Ticker() {
  const duplicated = [...RATES, ...RATES];

  return (
    <div className="bg-slate-900 border-y border-${p}-500/30 overflow-hidden py-2">
      <div className="flex animate-ticker">
        {duplicated.map((r, i) => (
          <TickerItem key={i} pair={r.pair} value={r.value} change={r.change} />
        ))}
      </div>
    </div>
  );
}
`;
}

function generateSEOHeadJsx() {
  return `import { Helmet } from 'react-helmet-async';\n\nexport default function SEOHead({ title, description, keywords, canonical, ogTags = {} }) {\n  return (\n    <Helmet>\n      <title>{title}</title>\n      <meta name="description" content={description} />\n      {keywords && <meta name="keywords" content={keywords} />}\n      {canonical && <link rel="canonical" href={canonical} />}\n      {Object.entries(ogTags).filter(([, v]) => v).map(([key, value]) =>\n        key.startsWith('og:') ? <meta key={key} property={key} content={value} /> : <meta key={key} name={key} content={value} />\n      )}\n    </Helmet>\n  );\n}\n`;
}

function generateReadme(brand, domain, pages) {
  return `# ${brand}\n\nWebsite for **${brand}** — ${domain}\n\n## Pages\n${pages.map(p => `- ${p}`).join('\n')}\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Build for Production\n\n\`\`\`bash\nnpm run build\n\`\`\`\n\nThe built files will be in the \`dist\` directory, ready to deploy to any static hosting.\n\n## Tech Stack\n\n- React 18\n- React Router v6\n- Tailwind CSS 3\n- Vite 6\n- react-helmet-async (SEO)\n`;
}
