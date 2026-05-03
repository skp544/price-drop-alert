const puppeteer = require('puppeteer');
const { parsePrice, sleep, withRetry, getRandomUserAgent } = require('../utils/helpers');
const logger = require('../utils/logger');

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
  ],
};

// ─── Amazon ──────────────────────────────────────────────────────────────────

const AMAZON_PRICE_SELECTORS = [
  'span.a-price.priceToPay span.a-offscreen',
  'span.a-price span.a-offscreen',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '#price_inside_buybox',
  '.a-size-medium.a-color-price',
  '#corePrice_feature_div span.a-offscreen',
  '#corePriceDisplay_desktop_feature_div span.a-offscreen',
  '.a-price.a-text-price.a-size-medium.apexPriceToPay span.a-offscreen',
];

const scrapeAmazon = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

  // Wait a moment for dynamic content
  await sleep(1500);

  const data = await page.evaluate((priceSelectors) => {
    // Title
    const titleEl = document.querySelector('#productTitle');
    const title = titleEl ? titleEl.textContent.trim() : null;

    // Image
    const imgEl = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
    const imageUrl = imgEl ? imgEl.src : null;

    // Price — try selectors in order
    let price = null;
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        price = el.textContent.trim();
        break;
      }
    }

    return { title, price, imageUrl };
  }, AMAZON_PRICE_SELECTORS);

  return {
    title: data.title || 'Unknown Product',
    price: parsePrice(data.price),
    imageUrl: data.imageUrl || '',
  };
};

// ─── Flipkart ─────────────────────────────────────────────────────────────────

const FLIPKART_PRICE_SELECTORS = [
  '._30jeq3._16Jk6d',
  '._30jeq3',
  'div[class*="Nx9bqj"] ._30jeq3',
  'div[class*="CEmiEU"] div[class*="Nx9bqj"]',
  '.CEmiEU .Nx9bqj',
];

const FLIPKART_TITLE_SELECTORS = [
  'span.B_NuCI',
  'h1.yhB1nd span',
  'h1 span',
  '.G6XhRU h1',
];

const scrapeFlipkart = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await sleep(1500);

  // Dismiss login popup if present
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button._2KpZ6l._2doB4z');
    if (closeBtn) closeBtn.click();
  });

  const data = await page.evaluate((priceSelectors, titleSelectors) => {
    let title = null;
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        title = el.textContent.trim();
        break;
      }
    }

    const imgEl =
      document.querySelector('img._396cs4') ||
      document.querySelector('img.q6DClP') ||
      document.querySelector('._2r_T1I img');
    const imageUrl = imgEl ? imgEl.src : null;

    let price = null;
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        price = el.textContent.trim();
        break;
      }
    }

    return { title, price, imageUrl };
  }, FLIPKART_PRICE_SELECTORS, FLIPKART_TITLE_SELECTORS);

  return {
    title: data.title || 'Unknown Product',
    price: parsePrice(data.price),
    imageUrl: data.imageUrl || '',
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scrape a product from Amazon or Flipkart.
 * Returns { title, price, imageUrl }
 */
const scrapeProduct = async (url, platform) => {
  return withRetry(async () => {
    let browser;
    try {
      browser = await puppeteer.launch(LAUNCH_OPTIONS);
      const page = await browser.newPage();

      // Anti-detection: set realistic user agent and extra headers
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      });

      // Remove webdriver flag
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      let result;
      if (platform === 'amazon') {
        result = await scrapeAmazon(page, url);
      } else if (platform === 'flipkart') {
        result = await scrapeFlipkart(page, url);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      logger.debug(`Scraped ${platform}: title="${result.title}" price=${result.price}`);

      if (!result.price) {
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
