import { loadEnvVariables, getEnvVar } from './utils/envLoader';
import { createOpenAIClient } from './utils/openaiProcessor';
import { createSheetsClient } from './utils/sheetsProcessor';

/**
 * Test script to verify environment setup
 * Run with: npm run dev src/testSetup.ts
 */
const testSetup = async (): Promise<void> => {
  console.log('🧪 Testing Environment Setup\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Environment Variables
    console.log('\n📋 Test 1: Loading Environment Variables...');
    loadEnvVariables();
    console.log('✅ Environment variables loaded successfully');

    // Test 2: OpenAI Client
    console.log('\n📋 Test 2: Testing OpenAI Connection...');
    const openaiApiKey = getEnvVar('OPENAI_API_KEY');
    const openaiClient = createOpenAIClient(openaiApiKey);
    
    // Test simple completion
    const testResponse = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say "Hello" in Hebrew' }],
      max_tokens: 50
    });
    
    const hebrewResponse = testResponse.choices[0]?.message?.content;
    console.log('✅ OpenAI API working');
    console.log(`   Response: ${hebrewResponse}`);

    // Test 3: Google Sheets Client
    console.log('\n📋 Test 3: Testing Google Sheets Connection...');
    const googleSheetsId = getEnvVar('GOOGLE_SHEET_ID');
    const serviceAccountEmail = getEnvVar('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = getEnvVar('GOOGLE_PRIVATE_KEY');
    
    const sheetsClient = createSheetsClient(serviceAccountEmail, privateKey);
    
    // Try to read the spreadsheet metadata
    const sheetsResponse = await sheetsClient.spreadsheets.get({
      spreadsheetId: googleSheetsId
    });
    
    console.log('✅ Google Sheets API working');
    console.log(`   Spreadsheet Title: ${sheetsResponse.data.properties?.title}`);
    console.log(`   Sheet URL: https://docs.google.com/spreadsheets/d/${googleSheetsId}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed! Your environment is ready.');
    console.log('\n💡 Next steps:');
    console.log('   1. Place a PDF file as "input.pdf" in the project root');
    console.log('   2. Run: npm run dev');
    console.log('   3. Or specify PDF path: npm run dev "path/to/file.pdf"');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   • Verify all environment variables in .env.local');
    console.log('   • Check OpenAI API key is valid and has credits');
    console.log('   • Ensure Google Sheet is shared with service account');
    console.log('   • Verify GOOGLE_SHEET_ID is correct');
    process.exit(1);
  }
};

// Run the test
testSetup().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

