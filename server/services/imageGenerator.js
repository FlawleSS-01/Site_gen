import axios from 'axios';

// Official API: https://gen.pollinations.ai/image/{prompt}
// Model param is REQUIRED - see https://github.com/pollinations/pollinations/issues/7440
const IMAGE_API = 'https://gen.pollinations.ai/image';

const CASINO_IMAGE_PROMPTS = {
  home: 'luxurious casino interior with golden chandeliers, slot machines, neon lights, vibrant atmosphere, Las Vegas style',
  about: 'elegant casino lobby with red carpet, golden accents, professional staff, premium gaming floor',
  games: 'colorful slot machines and roulette tables, casino gaming floor, bright lights, excitement',
  bonuses: 'golden coins and casino chips scattered, bonus jackpot concept, celebratory confetti',
  promotions: 'festive casino promotion banner, special offer concept, golden and red colors',
  contact: 'modern casino customer support, friendly atmosphere, professional service desk',
  faq: 'casino information desk, helpful staff, bright welcoming environment',
  blog: 'casino lifestyle, entertainment and gaming concept, vibrant colors',
  slots: 'colorful slot machine reels, jackpot symbols, bright casino lights',
  live: 'live casino table with dealer, cards and chips, professional gaming'
};

function getImagePrompt(pageName, brand, imageStyle) {
  const normalizedPage = pageName.toLowerCase().trim();
  const basePrompt = CASINO_IMAGE_PROMPTS[normalizedPage]
    || `luxurious casino ${normalizedPage} concept, golden accents, neon lights, vibrant gaming atmosphere, ${brand}`;

  const styleMap = {
    business: 'elegant casino photography, premium luxury, professional',
    modern: 'modern casino design, sleek neon, contemporary gaming',
    creative: 'vibrant artistic casino, bold colors, dynamic composition',
    nature: 'organic casino aesthetic, warm golden tones',
    minimalist: 'clean casino design, refined luxury, minimal clutter'
  };

  const styleDesc = styleMap[imageStyle] || styleMap.modern;
  return `${basePrompt}, ${styleDesc}, photorealistic, high quality, no text, no watermark`;
}

export async function generateImage(pageName, brand, imageStyle) {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  const prompt = getImagePrompt(pageName, brand, imageStyle);
  const seed = Math.floor(Math.random() * 999999);

  console.log(`[IMG] Generating for "${pageName}" (seed: ${seed})...`);
  console.log(`[IMG] API: gen.pollinations.ai, Key: ${apiKey ? 'YES' : 'NO'}`);

  const params = new URLSearchParams({
    model: 'klein', //klein //gptimage
    width: '1200',
    height: '630',
    seed: seed.toString()
  });

  const url = `${IMAGE_API}/${encodeURIComponent(prompt)}?${params}`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[IMG] Attempt ${attempt + 1}/${maxRetries} for "${pageName}"...`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        headers: {
          'Accept': 'image/*',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      const contentType = response.headers['content-type'] || '';
      const size = response.data?.byteLength || 0;
      console.log(`[IMG] Response: status=${response.status}, content-type=${contentType}, size=${size}`);

      if (response.status === 401) {
        throw new Error('401 Unauthorized - Check API key. Get key at enter.pollinations.ai');
      }
      if (response.status === 402) {
        throw new Error('402 Insufficient pollen balance - Top up at enter.pollinations.ai');
      }
      if (response.status >= 400) {
        const textSnippet = Buffer.from(response.data || []).toString('utf-8').substring(0, 300);
        throw new Error(`API error ${response.status}: ${textSnippet}`);
      }

      if (!contentType.includes('image')) {
        const textSnippet = Buffer.from(response.data).toString('utf-8').substring(0, 200);
        console.error(`[IMG] Non-image response: ${textSnippet}`);
        throw new Error(`Expected image, got ${contentType}`);
      }

      let imageBuffer = Buffer.from(response.data);

      if (imageBuffer.length > 500 * 1024) {
        console.log(`[IMG] Image too large (${(imageBuffer.length / 1024).toFixed(0)}KB), requesting smaller...`);
        const smallerParams = new URLSearchParams({
          model: 'klein', //klein //gptimage
          width: '800',
          height: '420',
          seed: seed.toString()
        });
        const smallerUrl = `${IMAGE_API}/${encodeURIComponent(prompt)}?${smallerParams}`;
        const smallerRes = await axios.get(smallerUrl, {
          responseType: 'arraybuffer',
          timeout: 120000,
          headers: {
            'Accept': 'image/*',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
          }
        });
        imageBuffer = Buffer.from(smallerRes.data);
      }

      console.log(`[IMG] Success for "${pageName}": ${(imageBuffer.length / 1024).toFixed(0)}KB`);

      return {
        buffer: imageBuffer,
        filename: `${pageName.toLowerCase().replace(/\s+/g, '-')}-hero.jpg`,
        size: imageBuffer.length
      };
    } catch (err) {
      console.error(`[IMG] Attempt ${attempt + 1} failed for "${pageName}":`, err.message);
      if (err.response) {
        console.error(`[IMG] Status: ${err.response.status}`);
      }
      if (attempt === maxRetries - 1) {
        console.error(`[IMG] All retries exhausted for "${pageName}"`);
        return null;
      }
      const delay = 5000 * (attempt + 1);
      console.log(`[IMG] Waiting ${delay}ms before retry...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export async function generateAllImages(pages, brand, imageStyle, colorScheme, onProgress) {
  const images = {};

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (onProgress) onProgress(page);

    const img = await generateImage(page, brand, imageStyle);
    if (img) {
      images[page] = img;
    }

    if (i < pages.length - 1) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  console.log(`[IMG] Generated ${Object.keys(images).length}/${pages.length} images total`);
  return images;
}
