/**
 * Environment Variable Validation
 * Ensures all required environment variables are present
 * Prevents runtime errors in production
 */

interface EnvConfig {
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const requiredEnvVars = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
};

function validateEnv(): EnvConfig {
  const missing: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n\nPlease check your .env file.`;
    
    // In development, show helpful error
    if (import.meta.env.DEV) {
      console.error('❌ Environment Configuration Error:', errorMessage);
      console.info('💡 Create a .env file in the frontend directory with:');
      missing.forEach((key) => {
        console.info(`   ${key}=your_value_here`);
      });
    }
    
    // In production, throw error to prevent app from running with invalid config
    throw new Error(errorMessage);
  }

  return {
    apiBaseUrl: requiredEnvVars.VITE_API_BASE_URL!,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };
}

// Validate and export config
export const config = validateEnv();

// Export individual values for convenience
export const { apiBaseUrl, isDevelopment, isProduction } = config;
