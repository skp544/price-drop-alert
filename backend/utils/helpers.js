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
 * Detect whether a URL belongs to Amazon or Flipkart.
 */
const detectPlatform = (url) => {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('flipkart')) return 'flipkart';
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

module.exports = { parsePrice, detectPlatform, sleep, withRetry, getRandomUserAgent };
