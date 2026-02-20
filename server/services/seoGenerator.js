const INDEX_PAGES = ['casino', 'home'];

export function generateSitemap(domain, pages) {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const today = new Date().toISOString().split('T')[0];

  const urls = pages.map(page => {
    const key = page.toLowerCase().trim();
    const slug = INDEX_PAGES.includes(key) ? '' : key.replace(/\s+/g, '-');
    const priority = INDEX_PAGES.includes(key) ? '1.0' : '0.8';
    return `  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

export function generateRobotsTxt(domain) {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
}

export function generateCanonicalUrl(domain, pageName) {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const key = pageName.toLowerCase().trim();
  const slug = INDEX_PAGES.includes(key) ? '' : key.replace(/\s+/g, '-');
  return `${baseUrl}/${slug}`;
}

export function generateOpenGraphTags(meta, domain, pageName, brand) {
  const canonical = generateCanonicalUrl(domain, pageName);
  const imageSlug = pageName.toLowerCase().trim().replace(/\s+/g, '-');
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const imageUrl = `${baseUrl}/images/${imageSlug}-hero.jpg`;

  return {
    'og:title': meta.title,
    'og:description': meta.description,
    'og:type': 'website',
    'og:url': canonical,
    'og:site_name': brand,
    'og:image': imageUrl,
    'og:image:url': imageUrl,
    'og:image:secure_url': imageUrl,
    'og:image:type': 'image/jpeg',
    'og:image:alt': `${pageName} - ${brand}`,
    'og:locale': 'en_US',
    'og:locale:alternate': 'en_GB',
    'twitter:card': 'summary_large_image',
    'twitter:site': `@${brand.replace(/\s/g, '')}`,
    'twitter:creator': `@${brand.replace(/\s/g, '')}`,
    'twitter:title': meta.title,
    'twitter:description': meta.description,
    'twitter:image': imageUrl,
    'twitter:image:alt': `${pageName} - ${brand}`
  };
}
