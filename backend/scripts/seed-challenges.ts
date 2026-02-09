#!/usr/bin/env ts-node
/**
 * seed-challenges.ts
 *
 * CLI script to seed sample challenges into the database. Creates 7 daily
 * challenges (one per day starting today) with varied categories.
 *
 * Usage:
 *   npx ts-node scripts/seed-challenges.ts
 *
 * Options:
 *   --clear   Remove all existing challenges before seeding (destructive!)
 */

import knex, { Knex } from 'knex';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedChallenge {
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: string;
  starts_at: Date;
  ends_at: Date;
  voting_ends_at: Date;
}

// ---------------------------------------------------------------------------
// Challenge definitions
// ---------------------------------------------------------------------------

const CHALLENGE_TEMPLATES: Array<{
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}> = [
  {
    title: 'Show Your Best Dance Move',
    description:
      'Hit the floor and show off your best dance move in 30 seconds! Any style is welcome -- hip-hop, salsa, contemporary, or freestyle. Creativity and energy count!',
    category: 'Dance',
    difficulty: 'medium',
  },
  {
    title: 'Make Someone Laugh',
    description:
      'Record the funniest 30-second clip you can. Stand-up, slapstick, impressions, or reaction comedy -- whatever gets the most laughs wins!',
    category: 'Comedy',
    difficulty: 'easy',
  },
  {
    title: '30-Second HIIT Blast',
    description:
      'Show the most intense 30-second HIIT workout you can handle. Burpees, jump squats, mountain climbers -- go all out and inspire others!',
    category: 'Fitness',
    difficulty: 'hard',
  },
  {
    title: 'Quick Kitchen Creation',
    description:
      'Prepare or plate a dish in just 30 seconds. Speed, presentation, and creativity matter. Show us your kitchen magic!',
    category: 'Cooking',
    difficulty: 'medium',
  },
  {
    title: 'Speed Sketch Challenge',
    description:
      'Grab a pen and paper (or tablet) and sketch something amazing in 30 seconds. The theme is "nature". Show us your artistic speed!',
    category: 'Art',
    difficulty: 'hard',
  },
  {
    title: 'One-Take Music Moment',
    description:
      'Sing, rap, beatbox, or play an instrument -- deliver your best musical performance in a single 30-second take. No edits, pure talent!',
    category: 'Music',
    difficulty: 'medium',
  },
  {
    title: 'Style Switch-Up',
    description:
      'Show a dramatic outfit transformation in 30 seconds. Start casual and end glamorous, or flip any two contrasting styles. Transitions matter!',
    category: 'Fashion',
    difficulty: 'easy',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a Date that is `dayOffset` days from now, at the given hour (UTC).
 */
function dateAtOffset(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

/**
 * Build 7 daily challenges starting from today.
 *
 * Schedule per challenge:
 *   - starts_at:      day + 0h  (midnight UTC of the target day)
 *   - ends_at:        day + 18h (6 PM UTC -- 18 hours to submit)
 *   - voting_ends_at: day + 23h (11 PM UTC -- 5 extra hours to vote)
 */
function buildChallenges(): SeedChallenge[] {
  return CHALLENGE_TEMPLATES.map((template, index) => ({
    title: template.title,
    description: template.description,
    category: template.category,
    difficulty: template.difficulty,
    status: 'scheduled',
    starts_at: dateAtOffset(index, 0),
    ends_at: dateAtOffset(index, 18),
    voting_ends_at: dateAtOffset(index, 23),
  }));
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
  const shouldClear = process.argv.includes('--clear');

  const db = createDbConnection();

  try {
    if (shouldClear) {
      console.log('Clearing existing challenges ...');
      const deleted = await db('challenges').del();
      console.log(`  Removed ${deleted} existing challenge(s).`);
    }

    const challenges = buildChallenges();

    console.log(`Seeding ${challenges.length} daily challenges ...`);
    console.log('');

    for (const challenge of challenges) {
      const [inserted] = await db('challenges')
        .insert(challenge)
        .returning(['id', 'title', 'category', 'difficulty', 'starts_at']);

      const startsAt = new Date(inserted.starts_at).toISOString().slice(0, 10);
      console.log(
        `  [${inserted.category.padEnd(8)}] ${inserted.title.padEnd(30)} ` +
        `difficulty=${inserted.difficulty.padEnd(6)} date=${startsAt}  id=${inserted.id}`,
      );
    }

    console.log('');
    console.log(`Successfully seeded ${challenges.length} challenges.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to seed challenges: ${message}`);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
