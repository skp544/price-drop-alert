require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startCron } = require('./cron/priceCron');
const { verifyEmailConfig } = require('./services/emailService');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await verifyEmailConfig();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  startCron();

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

start();
