export const developmentConfig = {
  // Disable console logging in production
  enableConsoleLogs: __DEV__,
  
  // Cache settings
  cacheEnabled: false,
  
  // Fast refresh settings
  fastRefresh: true,
  
  // Metro bundler settings
  metro: {
    resetCache: true,
    clearCache: true,
    watchman: false, // Disable watchman if causing issues
  },
  
  // AsyncStorage settings
  asyncStorage: {
    clearOnStartup: __DEV__, // Clear storage on development startup
  }
};

// Helper function to conditionally log
export const devLog = (message: string, data?: any) => {
  if (developmentConfig.enableConsoleLogs) {
    console.log(`[DEV] ${message}`, data || '');
  }
};

// Helper function to conditionally warn
export const devWarn = (message: string, data?: any) => {
  if (developmentConfig.enableConsoleLogs) {
    console.warn(`[DEV] ${message}`, data || '');
  }
};

// Helper function to conditionally error
export const devError = (message: string, error?: any) => {
  if (developmentConfig.enableConsoleLogs) {
    console.error(`[DEV] ${message}`, error || '');
  }
};
