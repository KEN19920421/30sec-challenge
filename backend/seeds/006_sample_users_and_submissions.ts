import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * Seed: sample users + submissions for testing the TikTok-style video feed.
 *
 * - Creates 6 test users (password: "Test1234!")
 * - Creates 8 submissions with public sample video URLs
 * - All submissions are transcode_status='completed', moderation_status='approved'
 *   so they appear in the for-you feed immediately.
 */
export async function seed(knex: Knex): Promise<void> {
  // Clean up in correct order (foreign key constraints)
  await knex('submissions').del();
  await knex('users').whereIn('username', [
    'alice_dance',
    'bob_comedy',
    'carol_talent',
    'dave_fitness',
    'emi_creative',
    'frank_music',
  ]).del();

  const passwordHash = await bcrypt.hash('Test1234!', 12);

  // --- Users ---
  const userIds = {
    alice: uuidv4(),
    bob: uuidv4(),
    carol: uuidv4(),
    dave: uuidv4(),
    emi: uuidv4(),
    frank: uuidv4(),
  };

  await knex('users').insert([
    {
      id: userIds.alice,
      username: 'alice_dance',
      email: 'alice@example.com',
      password_hash: passwordHash,
      display_name: 'Alice',
      bio: 'Dance lover',
      role: 'user',
      subscription_tier: 'free',
      coin_balance: 100,
      submission_count: 2,
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: userIds.bob,
      username: 'bob_comedy',
      email: 'bob@example.com',
      password_hash: passwordHash,
      display_name: 'Bob',
      bio: 'Making people laugh since 2020',
      role: 'user',
      subscription_tier: 'free',
      coin_balance: 50,
      submission_count: 2,
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: userIds.carol,
      username: 'carol_talent',
      email: 'carol@example.com',
      password_hash: passwordHash,
      display_name: 'Carol',
      bio: 'Hidden talents everywhere',
      role: 'user',
      subscription_tier: 'pro',
      coin_balance: 500,
      submission_count: 1,
      locale: 'ja',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: userIds.dave,
      username: 'dave_fitness',
      email: 'dave@example.com',
      password_hash: passwordHash,
      display_name: 'Dave',
      bio: 'Fitness is my life',
      role: 'user',
      subscription_tier: 'free',
      coin_balance: 200,
      submission_count: 1,
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: userIds.emi,
      username: 'emi_creative',
      email: 'emi@example.com',
      password_hash: passwordHash,
      display_name: 'Emi',
      bio: 'Creative mind',
      role: 'user',
      subscription_tier: 'free',
      coin_balance: 75,
      submission_count: 1,
      locale: 'ja',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: userIds.frank,
      username: 'frank_music',
      email: 'frank@example.com',
      password_hash: passwordHash,
      display_name: 'Frank',
      bio: 'Music is everything',
      role: 'user',
      subscription_tier: 'pro',
      coin_balance: 300,
      submission_count: 1,
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);

  // --- Get active challenge ---
  const activeChallenge = await knex('challenges')
    .where('status', 'active')
    .first();

  if (!activeChallenge) {
    // eslint-disable-next-line no-console
    console.warn('No active challenge found — skipping submissions seed.');
    return;
  }

  const challengeId = activeChallenge.id;

  // Public sample videos — all ≤15s (short clips appropriate for 30sec challenge)
  // In production, videos are recorded at ≤30s by the camera screen.
  const sampleVideos = [
    {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15.0,
      width: 1280,
      height: 720,
    },
    {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 15.0,
      width: 1280,
      height: 720,
    },
    {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: 15.0,
      width: 1280,
      height: 720,
    },
    {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      duration: 15.0,
      width: 1280,
      height: 720,
    },
    {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15.0,
      width: 1280,
      height: 720,
    },
    {
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 15.0,
      width: 1280,
      height: 720,
    },
  ];

  // Helper to offset creation times so feed ordering is deterministic
  const minutesAgo = (mins: number) =>
    new Date(Date.now() - mins * 60 * 1000);

  // --- Submissions ---
  // Note: unique constraint (user_id, challenge_id) — one per user per challenge
  await knex('submissions').insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: userIds.alice,
      challenge_id: challengeId,
      caption: 'My best dance move ever!',
      video_key: 'videos/sample_01.mp4',
      video_url: sampleVideos[0].url,
      thumbnail_url: null,
      hls_url: null,
      video_duration: sampleVideos[0].duration,
      video_width: sampleVideos[0].width,
      video_height: sampleVideos[0].height,
      file_size_bytes: 2_000_000,
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 42,
      super_vote_count: 3,
      wilson_score: 0.65,
      total_views: 150,
      created_at: minutesAgo(60),
      updated_at: minutesAgo(60),
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      user_id: userIds.bob,
      challenge_id: challengeId,
      caption: 'Comedy gold right here',
      video_key: 'videos/sample_02.mp4',
      video_url: sampleVideos[1].url,
      thumbnail_url: null,
      hls_url: null,
      video_duration: sampleVideos[1].duration,
      video_width: sampleVideos[1].width,
      video_height: sampleVideos[1].height,
      file_size_bytes: 1_800_000,
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 87,
      super_vote_count: 8,
      wilson_score: 0.78,
      total_views: 320,
      created_at: minutesAgo(55),
      updated_at: minutesAgo(55),
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      user_id: userIds.carol,
      challenge_id: challengeId,
      caption: 'Watch my hidden talent!',
      video_key: 'videos/sample_03.mp4',
      video_url: sampleVideos[2].url,
      thumbnail_url: null,
      hls_url: null,
      video_duration: sampleVideos[2].duration,
      video_width: sampleVideos[2].width,
      video_height: sampleVideos[2].height,
      file_size_bytes: 2_200_000,
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 120,
      super_vote_count: 15,
      wilson_score: 0.85,
      total_views: 500,
      created_at: minutesAgo(50),
      updated_at: minutesAgo(50),
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      user_id: userIds.dave,
      challenge_id: challengeId,
      caption: '30-second HIIT challenge!',
      video_key: 'videos/sample_04.mp4',
      video_url: sampleVideos[3].url,
      thumbnail_url: null,
      hls_url: null,
      video_duration: sampleVideos[3].duration,
      video_width: sampleVideos[3].width,
      video_height: sampleVideos[3].height,
      file_size_bytes: 1_500_000,
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 55,
      super_vote_count: 5,
      wilson_score: 0.70,
      total_views: 210,
      created_at: minutesAgo(45),
      updated_at: minutesAgo(45),
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      user_id: userIds.emi,
      challenge_id: challengeId,
      caption: 'Creative cooking in 30 sec!',
      video_key: 'videos/sample_05.mp4',
      video_url: sampleVideos[4].url,
      thumbnail_url: null,
      hls_url: null,
      video_duration: sampleVideos[4].duration,
      video_width: sampleVideos[4].width,
      video_height: sampleVideos[4].height,
      file_size_bytes: 3_000_000,
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 200,
      super_vote_count: 20,
      wilson_score: 0.90,
      total_views: 800,
      created_at: minutesAgo(40),
      updated_at: minutesAgo(40),
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      user_id: userIds.frank,
      challenge_id: challengeId,
      caption: 'Music performance',
      video_key: 'videos/sample_06.mp4',
      video_url: sampleVideos[5].url,
      thumbnail_url: null,
      hls_url: null,
      video_duration: sampleVideos[5].duration,
      video_width: sampleVideos[5].width,
      video_height: sampleVideos[5].height,
      file_size_bytes: 2_500_000,
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 30,
      super_vote_count: 2,
      wilson_score: 0.55,
      total_views: 100,
      created_at: minutesAgo(35),
      updated_at: minutesAgo(35),
    },
  ]);

  // Update challenge submission count
  await knex('challenges')
    .where('id', challengeId)
    .update({ submission_count: 6, total_votes: 534 });
}
