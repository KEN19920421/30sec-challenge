#!/usr/bin/env ts-node
/**
 * create-admin.ts
 *
 * CLI script to create an admin user directly in the database.
 *
 * Usage:
 *   npx ts-node scripts/create-admin.ts --email admin@example.com --password SecurePass123
 *
 * Options:
 *   --email       (required) Admin user email address
 *   --password    (required) Admin user password (min 8 chars, 1 upper, 1 lower, 1 digit)
 *   --username    (optional) Username (defaults to email local part)
 *   --display     (optional) Display name (defaults to "Admin")
 */

import knex, { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  email: string;
  password: string;
  username: string;
  display: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const map: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key || !key.startsWith('--') || value === undefined) {
      console.error(`Invalid argument at position ${i}: ${key}`);
      printUsage();
      process.exit(1);
    }
    map[key.replace(/^--/, '')] = value;
  }

  if (!map.email || !map.password) {
    console.error('Error: --email and --password are required.');
    printUsage();
    process.exit(1);
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(map.email)) {
    console.error(`Error: "${map.email}" is not a valid email address.`);
    process.exit(1);
  }

  // Password strength validation (matches auth.validation.ts rules)
  const password = map.password;
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    process.exit(1);
  }
  if (!/[A-Z]/.test(password)) {
    console.error('Error: Password must contain at least one uppercase letter.');
    process.exit(1);
  }
  if (!/[a-z]/.test(password)) {
    console.error('Error: Password must contain at least one lowercase letter.');
    process.exit(1);
  }
  if (!/[0-9]/.test(password)) {
    console.error('Error: Password must contain at least one digit.');
    process.exit(1);
  }

  // Derive defaults for optional fields
  const emailLocal = map.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
  const username = map.username || emailLocal;
  const display = map.display || 'Admin';

  return { email: map.email.toLowerCase().trim(), password, username, display };
}

function printUsage(): void {
  console.log(`
Usage:
  npx ts-node scripts/create-admin.ts --email <email> --password <password> [--username <username>] [--display <name>]

Examples:
  npx ts-node scripts/create-admin.ts --email admin@example.com --password SecurePass123
  npx ts-node scripts/create-admin.ts --email admin@example.com --password SecurePass123 --username superadmin --display "Super Admin"
`);
}

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

function createDbConnection(): Knex {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const knexConfig = require('../knexfile');
  const environment = process.env.NODE_ENV || 'development';
  const config: Knex.Config = knexConfig[environment] || knexConfig.default?.[environment];

  if (!config) {
    console.error(`No knex configuration found for environment: "${environment}"`);
    process.exit(1);
  }

  return knex(config);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { email, password, username, display } = parseArgs();

  console.log(`Creating admin user: ${email} ...`);

  const db = createDbConnection();

  try {
    // Check for existing user with same email
    const existing = await db('users').where({ email }).first();
    if (existing) {
      if (existing.role === 'admin') {
        console.log(`User "${email}" already exists and is already an admin. Nothing to do.`);
        return;
      }
      // Promote existing user to admin
      await db('users').where({ id: existing.id }).update({ role: 'admin', updated_at: db.fn.now() });
      console.log(`Existing user "${email}" has been promoted to admin role.`);
      return;
    }

    // Check for existing username
    const existingUsername = await db('users').where({ username }).first();
    if (existingUsername) {
      console.error(`Error: Username "${username}" is already taken. Use --username to specify a different one.`);
      process.exit(1);
    }

    // Hash the password (12 salt rounds to match password.service.ts)
    const SALT_ROUNDS = 12;
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert admin user
    const [newUser] = await db('users')
      .insert({
        email,
        username,
        display_name: display,
        password_hash: passwordHash,
        role: 'admin',
        is_verified: true,
      })
      .returning(['id', 'email', 'username', 'role']);

    console.log('');
    console.log('Admin user created successfully!');
    console.log('--------------------------------');
    console.log(`  ID:       ${newUser.id}`);
    console.log(`  Email:    ${newUser.email}`);
    console.log(`  Username: ${newUser.username}`);
    console.log(`  Role:     ${newUser.role}`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to create admin user: ${message}`);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
