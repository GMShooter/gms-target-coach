// Test script to verify test frames are accessible
const fs = require('fs');
const path = require('path');

const testFramesDir = path.join(__dirname, 'public', 'test_videos_frames');

console.log('Checking test frames directory:', testFramesDir);

let files = [];
if (fs.existsSync(testFramesDir)) {
  files = fs.readdirSync(testFramesDir);
  console.log('Found files:', files);
  
  files.forEach(file => {
    const filePath = path.join(testFramesDir, file);
    const stats = fs.statSync(filePath);
    console.log(`- ${file}: ${stats.size} bytes`);
    
    // Check if file is empty
    if (stats.size === 0) {
      console.warn(`  WARNING: ${file} is empty!`);
    }
  });
} else {
  console.error('Test frames directory not found!');
  process.exit(1);
}

// Check if the files can be read as base64
console.log('\nTesting base64 conversion...');
files.forEach(file => {
  if (file.endsWith('.svg')) {
    const filePath = path.join(testFramesDir, file);
    try {
      const svgContent = fs.readFileSync(filePath, 'utf8');
      if (svgContent.trim().length === 0) {
        console.warn(`- ${file}: Cannot convert empty file to base64`);
      } else {
        const base64 = Buffer.from(svgContent).toString('base64');
        console.log(`- ${file}: Successfully converted to base64 (${base64.length} characters)`);
      }
    } catch (error) {
      console.error(`- ${file}: Error reading file - ${error.message}`);
    }
  }
});