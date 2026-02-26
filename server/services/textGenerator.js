import axios from 'axios';

const API_KEY = process.env.POLLINATIONS_API_KEY;
const TEXT_API = 'https://gen.pollinations.ai/v1/chat/completions';

async function callTextAPI(messages, temperature = 0.8) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await axios.post(TEXT_API, {
        model: 'openai',
        messages,
        temperature,
        max_tokens: 2000
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
        },
        timeout: 60000
      });
      return res.data.choices[0].message.content;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

export function replaceVariables(template, vars) {
  return template
    .replace(/\{\{brand\}\}/gi, vars.brand || '')
    .replace(/\{\{domain\}\}/gi, vars.domain || '')
    .replace(/\{\{page\}\}/gi, vars.page || '');
}

export async function generateUniqueContent(template, vars, pageName) {
  const baseText = replaceVariables(template, vars);

  const messages = [
    {
      role: 'system',
      content: `You are a professional SEO copywriter. Rewrite the provided website text to make it unique while preserving meaning, tone, SEO keywords, and structure. Keep it natural, engaging, and well-formatted for a website page. Output ONLY the rewritten text, no explanations. The text should be well-suited for the "${pageName}" page of a website.`
    },
    {
      role: 'user',
      content: `Rewrite this text to make it unique for the "${pageName}" page:\n\n${baseText}`
    }
  ];

  try {
    return await callTextAPI(messages, 0.9);
  } catch {
    return baseText;
  }
}

export async function generatePageSections(brand, domain, pageName, offerUrl) {
  const messages = [
    {
      role: 'system',
      content: `You are a creative web content writer for online casino and gaming websites. Generate vibrant, exciting content in JSON format. Output ONLY valid JSON, no markdown, no code fences.`
    },
    {
      role: 'user',
      content: `Generate content for the "${pageName}" page of the "${brand}" online casino website (${domain}).

Return JSON with this exact structure:
{
  "heroTitle": "main heading for the page",
  "heroSubtitle": "subtitle/description under the heading",
  "sections": [
    {
      "title": "section heading",
      "content": "2-3 sentences of content",
      "hasCTA": true
    }
  ],
  "ctaText": "call to action button text"
}

Requirements:
- heroTitle: catchy, exciting, casino/gaming themed, 5-10 words
- heroSubtitle: compelling, inviting, 20-40 words
- Generate 5-6 sections relevant to "${pageName}" (slots, bonuses, games, promotions, live casino, sports betting, VIP, etc.)
- Each section content: 2-4 sentences, engaging, vibrant tone, casino vocabulary (jackpot, bonus, spin, win, etc.)
- ctaText: action text like "Play Now", "Claim Bonus", "Join Now" (2-4 words)
- Tone: fun, exciting, colorful - NOT formal or corporate
- The CTA link is: ${offerUrl}`
    }
  ];

  try {
    const raw = await callTextAPI(messages, 0.7);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      heroTitle: `Welcome to ${brand} - ${pageName}`,
      heroSubtitle: `Spin the reels, hit the jackpot! ${brand} brings you the best casino games, exclusive bonuses, and the ultimate gaming experience at ${domain}.`,
      sections: [
        { title: `Play & Win at ${brand}`, content: `${brand} offers thrilling slots, live casino, and exclusive bonuses. Join thousands of winners at ${domain}. Experience world-class entertainment 24/7.`, hasCTA: true },
        { title: `Why Players Love ${brand}`, content: `Big jackpots, fast payouts, and 24/7 support. ${brand} delivers non-stop excitement and rewards. Our platform is trusted by players worldwide.`, hasCTA: false },
        { title: 'Exclusive VIP Program', content: `Join our VIP program for personalized rewards, higher limits, and dedicated account managers. The more you play, the more you earn!`, hasCTA: false },
        { title: 'Lightning-Fast Payouts', content: `Withdraw your winnings in under 90 seconds via trusted payment methods. We support all major e-wallets, cards, and crypto payments.`, hasCTA: false },
        { title: 'Safe & Secure Gaming', content: `Your security is our top priority. We use industry-leading encryption and are fully licensed to ensure fair play at all times.`, hasCTA: false },
        { title: 'Claim Your Bonus Now', content: `Ready to play? Visit ${domain} and grab your welcome bonus. The next big win could be yours! Start spinning today.`, hasCTA: true }
      ],
      ctaText: 'Play Now'
    };
  }
}

export async function generateMetaContent(brand, domain, pageName, metaTemplate) {
  if (metaTemplate?.perPage) {
    const pp = metaTemplate.perPage;
    return {
      title: `${pageName} - ${brand} | ${domain}`,
      description: pp.description || `${pageName} page of ${brand}. Visit ${domain}.`,
      keywords: pp.keywords || `${brand}, ${pageName}, ${domain}`
    };
  }

  if (metaTemplate?.title && metaTemplate?.description) {
    return {
      title: replaceVariables(metaTemplate.title, { brand, domain, page: pageName }),
      description: replaceVariables(metaTemplate.description, { brand, domain, page: pageName }),
      keywords: replaceVariables(metaTemplate.keywords || '', { brand, domain, page: pageName })
    };
  }

  const messages = [
    {
      role: 'system',
      content: 'You are an SEO expert. Generate meta tags. Output ONLY valid JSON, no markdown.'
    },
    {
      role: 'user',
      content: `Generate SEO meta tags for the "${pageName}" page of "${brand}" (${domain}). Return JSON: {"title":"...","description":"...","keywords":"..."}`
    }
  ];

  try {
    const raw = await callTextAPI(messages, 0.5);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      title: `${pageName} - ${brand} | ${domain}`,
      description: `${pageName} page of ${brand}. Visit ${domain} for more information.`,
      keywords: `${brand}, ${pageName}, ${domain}`
    };
  }
}
