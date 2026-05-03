const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * POST /api/users
 * Register or retrieve a user by email.
 */
const upsertUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, name } = req.body;

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $setOnInsert: { email: email.toLowerCase(), name: name || '' } },
      { upsert: true, new: true, runValidators: true }
    );

    logger.info(`User upserted: ${user.email}`);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:email
 * Get a user by email.
 */
const getUserByEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { upsertUser, getUserByEmail };
