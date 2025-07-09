#!/usr/bin/env node

/**
 * Backend Setup Validation Script
 * Validates that all dependencies and configuration are properly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Backend Setup...');
console.log('================================');

let hasErrors = false;

// Check if required files exist
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  '.env.production'
];

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const requiredDeps = ['express', 'pg', 'cors', 'dotenv', 'bcryptjs', 'nodemailer', 'uuid'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep} - ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      hasErrors = true;
    }
  });
} catch (error) {
  console.log('  ❌ Error reading package.json');
  hasErrors = true;
}

// Summary
console.log('\n📋 Validation Summary:');
if (hasErrors) {
  console.log('❌ Setup validation FAILED - Please fix the errors above');
  process.exit(1);
} else {
  console.log('✅ Setup validation PASSED - Backend is properly configured');
  console.log('\n🚀 Available commands:');
  console.log('  npm run dev        - Start development server with hot reload');
  console.log('  npm run dev:simple - Start development server without hot reload');
  console.log('  npm run build      - Build for production');
  console.log('  npm start          - Start production server');
}

console.log('\n================================');
console.log('Backend validation complete! 🎉');