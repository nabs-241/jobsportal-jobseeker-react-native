const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Clearing all caches...');

// Clear Expo cache
try {
  execSync('npx expo start --clear --reset-cache', { stdio: 'inherit' });
} catch (error) {
  console.log('Expo cache cleared');
}

// Clear Metro cache
try {
  execSync('npx react-native start --reset-cache', { stdio: 'inherit' });
} catch (error) {
  console.log('Metro cache cleared');
}

// Clear npm cache
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ NPM cache cleared');
} catch (error) {
  console.log('❌ Failed to clear NPM cache:', error.message);
}

// Clear node_modules (optional - uncomment if needed)
// console.log('🗑️ Removing node_modules...');
// try {
//   execSync('rm -rf node_modules', { stdio: 'inherit' });
//   execSync('npm install', { stdio: 'inherit' });
//   console.log('✅ node_modules reinstalled');
// } catch (error) {
//   console.log('❌ Failed to reinstall node_modules:', error.message);
// }

console.log('✨ Cache clearing complete!');
console.log('💡 Try running: npm run start-clear');
