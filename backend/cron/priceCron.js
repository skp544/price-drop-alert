const cron = require('node-cron');
const { runPriceCheckForAll } = require('../services/priceService');
const logger = require('../utils/logger');

let isRunning = false;

const startCron = () => {
  const schedule = process.env.CRON_SCHEDULE || '0 * * * *';

  logger.info(`Price check cron scheduled: "${schedule}"`);

  const task = cron.schedule(schedule, async () => {
    if (isRunning) {
      logger.warn('Price check already in progress, skipping this tick');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await runPriceCheckForAll();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`Cron completed in ${duration}s — ${JSON.stringify(stats)}`);
    } catch (err) {
      logger.error(`Cron job failed: ${err.message}`);
    } finally {
      isRunning = false;
    }
  });

  return task;
};

module.exports = { startCron };
