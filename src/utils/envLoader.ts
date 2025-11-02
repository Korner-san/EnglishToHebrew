import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Load environment variables from .env.local
 */
export const loadEnvVariables = (): void => {
  // Try multiple possible locations for .env.local
  const possiblePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '..', '..', '.env.local'),
    path.join(process.cwd(), '.env.local'),
    '.env.local'
  ];

  let result: any = { error: new Error('No .env.local file found') };
  let loadedPath: string | null = null;

  // Try each path until one works
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📍 Found .env.local at: ${envPath}`);
      result = dotenv.config({ path: envPath });
      loadedPath = envPath;
      break;
    }
  }

  if (result.error || !loadedPath) {
    console.error('❌ Could not find .env.local file in any of these locations:');
    possiblePaths.forEach(p => console.error(`   - ${p}`));
    console.error('\n💡 Please ensure .env.local exists in the project root directory:');
    console.error(`   ${process.cwd()}`);
    throw new Error('Failed to load environment variables - .env.local file not found');
  }

  // Validate required environment variables
  const requiredVars = [
    'OPENAI_API_KEY',
    'GOOGLE_SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];

  // Optional variables (won't fail if missing)
  const optionalVars = [
    'GOOGLE_DOCS_FOLDER_ID'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('\n💡 Your .env.local file should contain:');
    requiredVars.forEach(v => console.error(`   ${v}=...`));
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }

  console.log('✅ Environment variables loaded successfully');
  console.log(`✅ Loaded from: ${loadedPath}`);
};

/**
 * Get environment variable or throw error if not found
 */
export const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

