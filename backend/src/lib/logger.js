/**
 * Conditional logger that only logs in development mode
 * In production, only errors are logged to reduce overhead
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args) => {
    if (isDev) console.log(...args);
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args) => {
    if (isDev) console.debug(...args);
  }
};

export default logger;
