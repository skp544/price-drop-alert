const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');
const User = require('../models/User');
const { scrapeProduct } = require('../services/scraperService');
const { checkProductPrice } = require('../services/priceService');
const { detectPlatform, detectBrand, detectCategory } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * POST /api/products
 * Add a product to track. Scrapes initial price immediately.
 */
const addProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, url, targetPrice } = req.body;

    const platform = detectPlatform(url);
    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'URL must be from Amazon (amazon.in) or Flipkart (flipkart.com)',
      });
    }

    // Find or create user
    let user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $setOnInsert: { email: email.toLowerCase() } },
      { upsert: true, new: true }
    );

    // Check if already tracking this URL for this user
    const existing = await Product.findOne({
      userId: user._id,
      url,
      isActive: true,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You are already tracking this product',
        data: existing,
      });
    }

    // Scrape initial price
    let scraped = { title: 'Fetching...', price: null, imageUrl: '', inStock: true };
    try {
      scraped = await scrapeProduct(url, platform);
    } catch (scrapeErr) {
      logger.warn(`Initial scrape failed for ${url}: ${scrapeErr.message}`);
    }

    const resolvedTitle = scraped.title || 'Unknown Product';
    const product = await Product.create({
      userId: user._id,
      url,
      platform,
      title: resolvedTitle,
      imageUrl: scraped.imageUrl || '',
      currentPrice: scraped.price,
      targetPrice: parseFloat(targetPrice),
      category: detectCategory(resolvedTitle),
      brand: detectBrand(resolvedTitle),
      inStock: scraped.inStock !== false,
      lastCheckedAt: scraped.price ? new Date() : null,
      scrapeError: scraped.price || scraped.inStock === false ? null : 'Initial scrape failed',
    });

    // Record initial price in history
    if (scraped.price) {
      await PriceHistory.create({ productId: product._id, price: scraped.price });
    }

    logger.info(`Product added: ${product._id} (${platform}) for user ${user.email}`);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products?email=...
 * Get all products for a user.
 */
const getProducts = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email query param is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, data: [] });
    }

    const products = await Product.find({ userId: user._id, isActive: true }).sort({
      createdAt: -1,
    });

    res.json({ success: true, data: products, total: products.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 * Get a single product with its price history.
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const history = await PriceHistory.find({ productId: product._id })
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, data: { ...product.toObject(), priceHistory: history } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/products/:id/target
 * Update the target price for a product.
 */
const updateTargetPrice = async (req, res, next) => {
  try {
    const { targetPrice } = req.body;
    if (!targetPrice || isNaN(targetPrice) || parseFloat(targetPrice) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid target price required' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { targetPrice: parseFloat(targetPrice), lastNotifiedPrice: null },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/products/:id/wishlist
 * Toggle wishlist status for a product.
 */
const toggleWishlist = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isWishlisted = !product.isWishlisted;
    await product.save();

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/products/:id
 * Soft-delete (stop tracking) a product.
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    logger.info(`Product ${product._id} deactivated`);
    res.json({ success: true, message: 'Product removed from tracking' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products/:id/check
 * Manually trigger a price check for one product.
 */
const checkNow = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const result = await checkProductPrice(product);
    const updated = await Product.findById(product._id);

    res.json({ success: true, data: updated, result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id/history
 * Get price history for a product.
 */
const getPriceHistory = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const history = await PriceHistory.find({ productId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: history.reverse() });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  updateTargetPrice,
  toggleWishlist,
  deleteProduct,
  checkNow,
  getPriceHistory,
};
