#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Prettifies JSON files with consistent formatting
 * Usage: node prettify-json.js [directory]
 * Example: node prettify-json.js assets/questionnaire
 */

function findJsonFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (path.extname(item) === '.json') {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function prettifyJsonFiles(directory = 'assets/questionnaire') {
  try {
    if (!fs.existsSync(directory)) {
      console.error('Directory does not exist:', directory);
      process.exit(1);
    }

    const files = findJsonFiles(directory);

    if (files.length === 0) {
      console.log('No JSON files found in directory:', directory);
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    console.log(`Found ${files.length} JSON files to process...\n`);

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(content);
        const prettified = JSON.stringify(jsonData, null, 2);
        fs.writeFileSync(filePath, prettified + '\n');
        processedCount++;
        console.log('✓ Prettified:', filePath);
      } catch (error) {
        errorCount++;
        console.error('✗ Error processing', filePath + ':', error.message);
      }
    }

    console.log('\nSummary:');
    console.log(`- Successfully prettified: ${processedCount} files`);
    console.log(`- Errors: ${errorCount} files`);

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Get directory from command line argument or use default
const directory = process.argv[2] || 'assets/questionnaire';
prettifyJsonFiles(directory);