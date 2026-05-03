const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);

/**
 * Send a price drop notification email.
 */
const sendPriceDropEmail = async ({ toEmail, productTitle, oldPrice, newPrice, productUrl, targetPrice }) => {
  const transport = getTransporter();

  const subject = `Price Dropped! 🚀 ${productTitle.slice(0, 50)}...`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .body { padding: 30px; }
    .product-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 20px; }
    .price-box { display: flex; gap: 20px; margin: 20px 0; }
    .price-item { flex: 1; text-align: center; padding: 15px; border-radius: 8px; }
    .price-old { background: #fff0f0; border: 1px solid #ffcccc; }
    .price-new { background: #f0fff0; border: 1px solid #ccffcc; }
    .price-target { background: #f0f4ff; border: 1px solid #ccd8ff; }
    .price-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .price-value { font-size: 22px; font-weight: bold; margin-top: 5px; }
    .price-old .price-value { color: #cc0000; text-decoration: line-through; }
    .price-new .price-value { color: #00aa00; }
    .price-target .price-value { color: #3355cc; }
    .savings { text-align: center; background: #fffacd; border: 1px solid #ffd700; padding: 12px; border-radius: 6px; margin: 20px 0; }
    .savings strong { font-size: 18px; color: #cc6600; }
    .cta { text-align: center; margin: 25px 0; }
    .cta a { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; }
    .footer { background: #f8f8f8; padding: 15px 30px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Price Drop Alert!</h1>
      <p>Your target price has been reached</p>
    </div>
    <div class="body">
      <div class="product-title">${productTitle}</div>
      <div class="price-box">
        <div class="price-item price-old">
          <div class="price-label">Was</div>
          <div class="price-value">${formatPrice(oldPrice)}</div>
        </div>
        <div class="price-item price-new">
          <div class="price-label">Now</div>
          <div class="price-value">${formatPrice(newPrice)}</div>
        </div>
        <div class="price-item price-target">
          <div class="price-label">Your Target</div>
          <div class="price-value">${formatPrice(targetPrice)}</div>
        </div>
      </div>
      <div class="savings">
        You save: <strong>${formatPrice(oldPrice - newPrice)}</strong> (${Math.round(((oldPrice - newPrice) / oldPrice) * 100)}% off)
      </div>
      <div class="cta">
        <a href="${productUrl}" target="_blank">Buy Now →</a>
      </div>
      <p style="font-size:13px;color:#666;text-align:center;">
        Hurry! Prices may change. This alert was triggered by Price Drop Alert System.
      </p>
    </div>
    <div class="footer">
      Price Drop Alert System · You received this because you track this product.
    </div>
  </div>
</body>
</html>`;

  const textBody = `Price Drop Alert!

Product: ${productTitle}
Old Price: ${formatPrice(oldPrice)}
New Price: ${formatPrice(newPrice)}
Your Target: ${formatPrice(targetPrice)}
You save: ${formatPrice(oldPrice - newPrice)}

Buy Now: ${productUrl}`;

  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    logger.info(`Email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send email to ${toEmail}: ${err.message}`);
    throw err;
  }
};

/**
 * Verify email transporter configuration.
 */
const verifyEmailConfig = async () => {
  try {
    const transport = getTransporter();
    await transport.verify();
    logger.info('Email transporter configured and ready');
    return true;
  } catch (err) {
    logger.warn(`Email transporter verification failed: ${err.message}`);
    return false;
  }
};

module.exports = { sendPriceDropEmail, verifyEmailConfig };
