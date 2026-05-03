const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');
const User = require('../models/User');
const { scrapeProduct } = require('./scraperService');
const { sendPriceDropEmail } = require('./emailService');
const { sleep } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Check price for a single product and send alert if needed.
 * Returns a result summary object.
 */
const checkProductPrice = async (product) => {
  const result = { productId: product._id, status: 'ok', priceDropped: false };

  try {
    const scraped = await scrapeProduct(product.url, product.platform);
    const newPrice = scraped.price;

    if (!newPrice) {
      await Product.findByIdAndUpdate(product._id, {
        scrapeError: 'Could not extract price',
        lastCheckedAt: new Date(),
      });
      result.status = 'scrape_error';
      return result;
    }

    // Update product with latest data
    const updateData = {
      currentPrice: newPrice,
      lastCheckedAt: new Date(),
      scrapeError: null,
    };
    if (scraped.title && scraped.title !== 'Unknown Product') {
      updateData.title = scraped.title;
    }
    if (scraped.imageUrl) {
      updateData.imageUrl = scraped.imageUrl;
    }

    await Product.findByIdAndUpdate(product._id, updateData);

    // Record price history
    await PriceHistory.create({ productId: product._id, price: newPrice });

    result.oldPrice = product.currentPrice;
    result.newPrice = newPrice;

    // Check if price drop alert should fire
    const shouldNotify =
      newPrice <= product.targetPrice &&
      (product.lastNotifiedPrice === null || newPrice < product.lastNotifiedPrice);

    if (shouldNotify) {
      const user = await User.findById(product.userId);
      if (user && user.email) {
        try {
          await sendPriceDropEmail({
            toEmail: user.email,
            productTitle: scraped.title || product.title,
            oldPrice: product.currentPrice || newPrice,
            newPrice,
            productUrl: product.url,
            targetPrice: product.targetPrice,
          });

          await Product.findByIdAndUpdate(product._id, { lastNotifiedPrice: newPrice });
          result.priceDropped = true;
          result.notified = true;
          logger.info(`Price drop alert sent for product ${product._id} to ${user.email}`);
        } catch (emailErr) {
          result.notified = false;
          result.emailError = emailErr.message;
          logger.error(`Email failed for product ${product._id}: ${emailErr.message}`);
        }
      }
    }

    // Reset lastNotifiedPrice if price went back up above target
    if (newPrice > product.targetPrice && product.lastNotifiedPrice !== null) {
      await Product.findByIdAndUpdate(product._id, { lastNotifiedPrice: null });
    }

    return result;
  } catch (err) {
    logger.error(`Error checking product ${product._id}: ${err.message}`);
    await Product.findByIdAndUpdate(product._id, {
      scrapeError: err.message,
      lastCheckedAt: new Date(),
    });
    result.status = 'error';
    result.error = err.message;
    return result;
  }
};

/**
 * Run price check for ALL active products with a delay between each.
 */
const runPriceCheckForAll = async () => {
  logger.info('Starting price check run for all products...');
  const products = await Product.find({ isActive: true });

  if (products.length === 0) {
    logger.info('No active products to check');
    return { checked: 0, dropped: 0, errors: 0 };
  }

  const stats = { checked: 0, dropped: 0, errors: 0 };

  for (const product of products) {
    const result = await checkProductPrice(product);
    stats.checked++;
    if (result.priceDropped) stats.dropped++;
    if (result.status === 'error' || result.status === 'scrape_error') stats.errors++;

    // Delay between products to avoid getting blocked
    await sleep(parseInt(process.env.SCRAPER_DELAY_MS) || 2000);
  }

  logger.info(
    `Price check complete — checked: ${stats.checked}, dropped: ${stats.dropped}, errors: ${stats.errors}`
  );
  return stats;
};

module.exports = { checkProductPrice, runPriceCheckForAll };
