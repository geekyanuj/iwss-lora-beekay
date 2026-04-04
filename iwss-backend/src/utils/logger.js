/**
 * Custom logger utility for consistent logging across the application.
 * Highlights messages with icons and manages log levels.
 */
const logger = {
    info: (message, ...args) => {
      console.log(`✅ [INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    },
    error: (message, error) => {
      console.error(`❌ [ERROR] ${message}`);
      if (error && error.message) {
        console.error(`   Message: ${error.message}`);
      }
      if (error && error.stack) {
        // Log stack trace only in development
        if (process.env.NODE_ENV !== 'production') {
          console.error(error.stack);
        }
      }
    },
    debug: (message, ...args) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔍 [DEBUG] ${message}`, ...args);
      }
    }
  };
  
  export default logger;
  
