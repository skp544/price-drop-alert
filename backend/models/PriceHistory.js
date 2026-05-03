const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

priceHistorySchema.index({ productId: 1, timestamp: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
