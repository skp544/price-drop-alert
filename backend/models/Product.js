const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Product URL is required'],
      trim: true,
    },
    platform: {
      type: String,
      enum: ['amazon', 'flipkart'],
      required: true,
    },
    title: {
      type: String,
      default: 'Fetching title...',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    currentPrice: {
      type: Number,
      default: null,
    },
    previousPrice: {
      type: Number,
      default: null,
    },
    targetPrice: {
      type: Number,
      required: [true, 'Target price is required'],
      min: [0, 'Target price must be positive'],
    },
    lastNotifiedPrice: {
      type: Number,
      default: null,
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      enum: ['phone', 'tablet', 'laptop', 'desktop', 'tv', 'audio', 'camera', 'wearable', 'gaming', 'accessories', 'other'],
      default: 'other',
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    scrapeError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
