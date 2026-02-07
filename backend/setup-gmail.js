#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📧 Gmail Setup Helper for Smart Travel');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found existing .env file');
} else {
  console.log('📝 Creating new .env file');
  envContent = '';
}

// Instructions
console.log('\n🔧 To set up Gmail for real emails:');
console.log('1. Go to: https://myaccount.google.com/');
console.log('2. Security → 2-Step Verification → Turn on');
console.log('3. 2-Step Verification → App passwords');
console.log('4. Select "Mail" and "Other (Custom name)"');
console.log('5. Name it "Smart Travel" and generate password');
console.log('6. Copy the 16-character password\n');

// Prompt for user input (in a real scenario, you'd use readline)
console.log('📝 Once you have your Gmail App Password, update your .env file with:');
console.log('');
console.log('EMAIL_USER=your-email@gmail.com');
console.log('EMAIL_PASS=xxxx xxxx xxxx xxxx');
console.log('FRONTEND_URL=http://localhost:5173');
console.log('');

// Add to .env if it doesn't exist
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file - please add your Gmail credentials above');
} else {
  console.log('✅ Please update your existing .env file with the Gmail credentials');
}

console.log('\n🚀 After updating .env:');
console.log('1. Restart the backend server: npm run dev');
console.log('2. Test the forgot password functionality');
console.log('3. Check your Gmail inbox for the reset email!');
console.log('\n💡 For development, you can also use the Ethereal preview URL in the console.');
