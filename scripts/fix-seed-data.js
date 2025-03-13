#!/usr/bin/env node
/**
 * Script to fix seed data files
 */

const fs = require('fs');
const path = require('path');

// Path to the debug data directory
const dataDir = path.join(__dirname, '..', 'functions', 'data', 'debug');

// Fix the invitations.json file
try {
  const invitationsPath = path.join(dataDir, 'invitations.json');
  console.log(`Fixing ${invitationsPath}`);
  fs.writeFileSync(invitationsPath, '{}');
  console.log('✓ Invitations file fixed');
} catch (err) {
  console.error('Error fixing invitations file:', err);
}

// Make a backup of users.json
try {
  const usersPath = path.join(dataDir, 'users.json');
  const usersBackupPath = path.join(dataDir, 'users.json.bak');
  
  console.log(`Making backup of ${usersPath} to ${usersBackupPath}`);
  fs.copyFileSync(usersPath, usersBackupPath);
  
  // Read the users.json file and ensure it's valid
  const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  
  // Write back a clean version
  fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
  console.log('✓ Users file fixed');
} catch (err) {
  console.error('Error fixing users file:', err);
}

console.log('Seed data files have been fixed.');