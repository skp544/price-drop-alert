const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { parsePrice, sleep, withRetry, getRandomUserAgent } = require('../utils/helpers');
const logger = require('../utils/logger');

puppeteerExtra.use(StealthPlugin());

const TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT) || 30000;
const DELAY_MS = parseInt(process.env.SCRAPER_DELAY_MS) || 2000;
const RETRY_ATTEMPTS = parseInt(process.env.SCRAPER_RETRY_ATTEMPTS) || 3;

const LAUNCH_OPTIONS = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
};

// ─── Shared page setup ────────────────────────────────────────────────────────

const setupPage = async (browser) => {
  const page = await browser.newPage();
  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  });
  // Block images and fonts to speed up loading (we only need the DOM)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
};

// ─── Amazon ──────────────────────────────────────────────────────────────────

const AMAZON_PRICE_SELECTORS = [
  'span.a-price.priceToPay span.a-offscreen',
  '#corePriceDisplay_desktop_feature_div span.a-offscreen',
  '#corePrice_feature_div span.a-offscreen',
  'span.a-price span.a-offscreen',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '#price_inside_buybox',
  '.a-size-medium.a-color-price',
];

const scrapeAmazon = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await sleep(1500);

  const data = await page.evaluate((priceSelectors) => {
    const title = document.querySelector('#productTitle')?.textContent?.trim() ?? null;
    const imgEl = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
    const imageUrl = imgEl?.src ?? null;

    let priceText = null;
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        priceText = el.textContent.trim();
        break;
      }
    }

    // Fallback: og meta
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;

    // Out-of-stock: Amazon removes the price and shows an explicit availability message
    const availabilityText = document.querySelector('#availability')?.textContent?.trim().toLowerCase() || '';
    const outOfStock =
      !priceText &&
      (document.querySelector('#outOfStock') !== null ||
        availabilityText.includes('currently unavailable') ||
        availabilityText.includes('out of stock'));

    return { title: title || ogTitle || document.title?.split(':')[0]?.trim(), priceText, imageUrl, outOfStock };
  }, AMAZON_PRICE_SELECTORS);

  return {
    title: data.title || 'Unknown Product',
    price: parsePrice(data.priceText),
    imageUrl: data.imageUrl || '',
    inStock: !data.outOfStock,
  };
};

// ─── Flipkart ─────────────────────────────────────────────────────────────────

const FLIPKART_TITLE_SELECTORS = [
  'span.B_NuCI',
  'span.VU-ZEz',
  'h1 span',
  'h1',
];

const scrapeFlipkart = async (page, url) => {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await sleep(1500);

  // Dismiss login popup
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button._2KpZ6l._2doB4z') ||
                     document.querySelector('button[class*="close"]');
    if (closeBtn) closeBtn.click();
  }).catch(() => {});

  const data = await page.evaluate((titleSelectors) => {
    // ── Title ──
    let title = null;
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) { title = el.textContent.trim(); break; }
    }
    if (!title) {
      title =
        document.querySelector('meta[property="og:title"]')?.content ||
        document.title?.split('|')[0]?.split('-')[0]?.trim() ||
        null;
    }

    // ── Price: collect ALL candidate price elements, pick the correct one ──
    //
    // Flipkart pages contain MULTIPLE ₹ amounts:
    //   • Actual selling price  e.g. ₹68,990
    //   • EMI installment       e.g. ₹3,445/month  ← wrong, always lower
    //   • Bank cashback         e.g. ₹500 off
    //   • MRP (crossed out)     e.g. ₹79,999
    //
    // Strategy:
    //   1. Gather every leaf text node that looks like a standalone price (^₹N,NNN$)
    //   2. Discard any whose ancestor element's text contains EMI / month / cashback / off
    //   3. From the remaining candidates take the MAXIMUM value
    //      (MRP is always ≥ selling price, and the selling price is what we want when
    //       there is no MRP — when both are present, the selling price is the lower one
    //       but still higher than any EMI amount)
    //
    // This avoids hard-coding class names that Flipkart rotates.

    const EMI_PATTERNS = /\b(emi|month|per\s*month|cashback|instant\s*discount|off\b)/i;
    const PRICE_RE = /^₹[\d,]+$/;

    // Separate MRP (inside <s> or <del>) from the actual selling price.
    // Walk every text node once, classify each price candidate, then pick the max
    // from the selling bucket (non-EMI, non-struck-through).
    const sellingCandidates = [];
    const mrpCandidates = [];

    let node;
    const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while ((node = w2.nextNode())) {
      const text = node.textContent.trim();
      if (!PRICE_RE.test(text)) continue;
      const value = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (!value) continue;

      // EMI check
      let ancestor2 = node.parentElement;
      let isEmi2 = false;
      for (let i = 0; i < 4 && ancestor2; i++) {
        if (EMI_PATTERNS.test(ancestor2.textContent)) { isEmi2 = true; break; }
        ancestor2 = ancestor2.parentElement;
      }
      if (isEmi2) continue;

      // MRP check: inside <s> or <del>?
      let isMrp = false;
      let p = node.parentElement;
      for (let i = 0; i < 5 && p; i++) {
        if (['S', 'DEL'].includes(p.tagName)) { isMrp = true; break; }
        p = p.parentElement;
      }

      if (isMrp) mrpCandidates.push(value);
      else sellingCandidates.push(value);
    }

    let priceValue = null;
    if (sellingCandidates.length > 0) {
      // Among selling-price candidates, take the MAXIMUM
      // (avoids picking up a smaller accessory price shown further down the page)
      priceValue = Math.max(...sellingCandidates);
    } else if (mrpCandidates.length > 0) {
      priceValue = Math.max(...mrpCandidates);
    }

    const priceText = priceValue ? `₹${priceValue}` : null;

    // ── Image ──
    const imgEl =
      document.querySelector('img._396cs4') ||
      document.querySelector('img.q6DClP') ||
      document.querySelector('div._3kidJX img') ||
      document.querySelector('img[class*="product"]');

    // Out-of-stock: Flipkart drops the price and swaps the buy button for "NOTIFY ME"
    // or shows a "Sold Out" / "currently unavailable" message instead.
    const buyButtonText = (document.querySelector('button._2KpZ6l._2U9uOA')?.textContent || '').toLowerCase();
    const bodyText = document.body.innerText.toLowerCase();
    const outOfStock =
      !priceText &&
      (buyButtonText.includes('notify me') ||
        bodyText.includes('sold out') ||
        bodyText.includes('currently unavailable'));

    return { title, priceText, imageUrl: imgEl?.src ?? null, outOfStock };
  }, FLIPKART_TITLE_SELECTORS);

  return {
    title: data.title || 'Unknown Product',
    price: parsePrice(data.priceText),
    imageUrl: data.imageUrl || '',
    inStock: !data.outOfStock,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

const scrapeProduct = async (url, platform) => {
  return withRetry(async () => {
    let browser;
    try {
      browser = await puppeteerExtra.launch(LAUNCH_OPTIONS);
      const page = await setupPage(browser);

      let result;
      if (platform === 'amazon') {
        result = await scrapeAmazon(page, url);
      } else if (platform === 'flipkart') {
        result = await scrapeFlipkart(page, url);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      logger.debug(`Scraped ${platform}: title="${result.title}" price=${result.price} inStock=${result.inStock}`);

      if (!result.price && result.inStock !== false) {
        throw new Error(`Could not extract price from ${platform} page`);
      }

      return result;
    } finally {
      if (browser) await browser.close();
      await sleep(DELAY_MS);
    }
  }, RETRY_ATTEMPTS);
};

module.exports = { scrapeProduct };
