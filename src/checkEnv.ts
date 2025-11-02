import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Check what environment variables are defined in .env.local
 */
const checkEnv = (): void => {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  console.log('🔍 Checking .env.local file...\n');
  console.log(`📍 Location: ${envPath}\n`);
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    return;
  }
  
  // Load the file
  dotenv.config({ path: envPath });
  
  console.log('📋 Environment variables found:\n');
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'GOOGLE_SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Show first and last 4 characters only for security
      const masked = value.length > 8 
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : '****';
      console.log(`✅ ${varName}: ${masked} (${value.length} chars)`);
    } else {
      console.log(`❌ ${varName}: NOT FOUND`);
    }
  });
  
  // Show all keys that ARE defined
  console.log('\n📝 All keys in your .env.local file:');
  const allKeys = Object.keys(process.env).filter(key => {
    // Filter to likely custom env vars (not system vars)
    return !key.includes('PATH') && 
           !key.includes('TEMP') && 
           !key.includes('SYSTEM') &&
           !key.includes('PROCESSOR') &&
           !key.includes('OS') &&
           !key.includes('HOME') &&
           !key.includes('USER') &&
           !key.includes('NUMBER_OF');
  });
  
  // Read the file directly to see actual keys
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  const lines = fileContent.split('\n');
  
  console.log('\n📄 Keys found in .env.local file:');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (key) {
        console.log(`   Line ${index + 1}: ${key.trim()}`);
      }
    }
  });
};

checkEnv();

