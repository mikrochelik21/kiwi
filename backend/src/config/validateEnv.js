/**
 * Validates required environment variables on startup
 * Prevents the app from starting with missing critical configuration
 */

export function validateEnv() {
  // Required environment variables that must be present
  const required = ['MONGO_URI', 'JWT_SECRET'];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('\n❌ FATAL ERROR: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these variables in your .env file before starting the server.\n');
    process.exit(1);
  }
  
  // Warn about optional but recommended environment variables
  const optional = {
    'GOOGLE_PAGESPEED_API_KEY': 'Google PageSpeed Insights API (performance metrics will be estimated)',
    'OLLAMA_URL': 'Ollama LLM service (AI-powered recommendations will be disabled)',
    'UPSTASH_REDIS_REST_URL': 'Upstash Redis (rate limiting will not work)',
    'UPSTASH_REDIS_REST_TOKEN': 'Upstash Redis token (rate limiting will not work)'
  };
  
  const missingOptional = [];
  Object.entries(optional).forEach(([key, description]) => {
    if (!process.env[key]) {
      missingOptional.push({ key, description });
    }
  });
  
  if (missingOptional.length > 0) {
    console.warn('\n⚠️  Optional environment variables not set:');
    missingOptional.forEach(({ key, description }) => {
      console.warn(`   - ${key}: ${description}`);
    });
    console.warn('');
  }
  
  console.log('✅ Environment validation passed\n');
}

export default validateEnv;
