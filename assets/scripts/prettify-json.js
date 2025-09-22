#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Prettifies JSON files with consistent formatting
 * Usage: node prettify-json.js [pattern]
 * Example: node prettify-json.js "assets/questionnaire/**/*.json"
 */

async function prettifyJsonFiles(pattern = 'assets/questionnaire/**/*.json') {
  try {
    const files = await glob(pattern, { cwd: process.cwd() });

    if (files.length === 0) {
      console.log('No JSON files found matching pattern:', pattern);
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

// Get pattern from command line argument or use default
const pattern = process.argv[2] || 'assets/questionnaire/**/*.json';
prettifyJsonFiles(pattern);