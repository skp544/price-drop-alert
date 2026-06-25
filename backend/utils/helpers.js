/**
 * Parse price string to a float number.
 * Handles formats like "₹1,234.56", "1,234", "Rs. 999", "$29.99"
 */
const parsePrice = (priceStr) => {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Detect whether a URL belongs to Amazon, Flipkart, or Vijay Sales.
 */
const detectPlatform = (url) => {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('flipkart')) return 'flipkart';
    if (hostname.includes('vijaysales')) return 'vijaysales';
    return null;
  } catch {
    return null;
  }
};

/**
 * Sleep for a given number of milliseconds.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry an async function with exponential backoff.
 */
const withRetry = async (fn, maxAttempts = 3, baseDelayMs = 2000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }
  throw lastError;
};

/**
 * Random user agent strings to rotate through.
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

const getRandomUserAgent = () =>
  USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Common brands ordered from most specific to least, so longer/rarer names
 * are matched before short ambiguous ones (e.g. "Fire-Boltt" before "Bolt").
 */
const BRANDS = [
  'Fire-Boltt', 'Nothing', 'iQOO', 'OnePlus', 'Realme', 'Oppo', 'Vivo',
  'Xiaomi', 'Redmi', 'Poco', 'Samsung', 'Apple', 'Google', 'Motorola',
  'Nokia', 'Huawei', 'Honor',
  'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft', 'Razer',
  'boAt', 'JBL', 'Bose', 'Sennheiser', 'Jabra', 'Skullcandy', 'Noise',
  'Beats', 'Harman',
  'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'Sony',
  'LG', 'TCL', 'Hisense', 'Vu', 'Philips',
  'Corsair', 'SteelSeries', 'Logitech',
  'Fitbit', 'Garmin', 'Amazfit',
];

/**
 * Extract a known brand name from a product title.
 * Returns the matched brand (original casing) or an empty string.
 */
const detectBrand = (title) => {
  if (!title) return '';
  for (const brand of BRANDS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(title)) return brand;
  }
  return '';
};

/**
 * Maps keyword phrases to categories. Checked in declaration order so more
 * specific phrases (e.g. "gaming laptop") win over broader ones ("laptop").
 */
const CATEGORY_RULES = [
  { category: 'gaming',      keywords: ['gaming laptop', 'gaming phone', 'gaming headset', 'graphics card', 'gpu ', 'gamepad', 'joystick', 'playstation', 'xbox', 'nintendo', 'gaming keyboard', 'gaming mouse', 'gaming monitor'] },
  { category: 'phone',       keywords: ['smartphone', 'mobile phone', 'iphone', '5g phone', '4g phone', 'android phone'] },
  { category: 'tablet',      keywords: ['tablet', 'ipad', ' tab '] },
  { category: 'laptop',      keywords: ['laptop', 'notebook', 'macbook', 'chromebook'] },
  { category: 'desktop',     keywords: ['desktop', 'all-in-one', 'imac', ' pc '] },
  { category: 'tv',          keywords: ['smart tv', 'television', 'qled', 'oled tv', 'led tv', ' tv,', ' tv '] },
  { category: 'audio',       keywords: ['headphone', 'earphone', 'earbuds', 'neckband', 'airpods', 'soundbar', 'bluetooth speaker', 'wireless speaker', 'in-ear', 'over-ear'] },
  { category: 'camera',      keywords: ['camera', 'dslr', 'mirrorless', 'action cam'] },
  { category: 'wearable',    keywords: ['smartwatch', 'smart watch', 'fitness band', 'fitness tracker', 'activity tracker'] },
  { category: 'accessories', keywords: ['phone case', 'screen protector', 'power bank', 'fast charger', 'usb cable', 'type-c cable', 'wireless charger', 'back cover'] },
];

/**
 * Infer a product category from its title.
 * Returns one of the Product category enum values, defaulting to 'other'.
 */
const detectCategory = (title) => {
  if (!title) return 'other';
  const lower = title.toLowerCase();
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'other';
};

module.exports = { parsePrice, detectPlatform, sleep, withRetry, getRandomUserAgent, detectBrand, detectCategory };
