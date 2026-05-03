const express = require('express');
const { body } = require('express-validator');
const { upsertUser, getUserByEmail } = require('../controllers/userController');

const router = express.Router();

router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('name').optional().trim().isLength({ max: 100 }),
  ],
  upsertUser
);

router.get('/:email', getUserByEmail);

module.exports = router;
