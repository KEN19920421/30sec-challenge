import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Materialized view: challenge rankings
  await knex.raw(`
    CREATE MATERIALIZED VIEW mv_challenge_rankings AS
    SELECT
      s.challenge_id,
      s.id AS submission_id,
      s.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      s.vote_count,
      s.super_vote_count,
      s.wilson_score,
      RANK() OVER (
        PARTITION BY s.challenge_id
        ORDER BY s.wilson_score DESC, s.vote_count DESC, s.created_at ASC
      ) AS rank
    FROM submissions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.moderation_status = 'approved'
      AND s.is_hidden = false
      AND s.deleted_at IS NULL
      AND u.is_banned = false
      AND u.deleted_at IS NULL
  `);

  // Indexes on mv_challenge_rankings
  await knex.raw(`
    CREATE UNIQUE INDEX idx_mv_challenge_rankings_challenge_submission
    ON mv_challenge_rankings (challenge_id, submission_id)
  `);
  await knex.raw(`
    CREATE INDEX idx_mv_challenge_rankings_challenge_rank
    ON mv_challenge_rankings (challenge_id, rank)
  `);
  await knex.raw(`
    CREATE INDEX idx_mv_challenge_rankings_user_id
    ON mv_challenge_rankings (user_id)
  `);

  // Materialized view: trending submissions (top submissions from last 24h by wilson_score)
  await knex.raw(`
    CREATE MATERIALIZED VIEW mv_trending_submissions AS
    SELECT
      s.id AS submission_id,
      s.challenge_id,
      s.user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      s.caption,
      s.thumbnail_url,
      s.video_url,
      s.hls_url,
      s.vote_count,
      s.super_vote_count,
      s.wilson_score,
      s.total_views,
      s.gift_coins_received,
      s.created_at,
      RANK() OVER (
        ORDER BY s.wilson_score DESC, s.vote_count DESC, s.created_at ASC
      ) AS trending_rank
    FROM submissions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.moderation_status = 'approved'
      AND s.is_hidden = false
      AND s.deleted_at IS NULL
      AND u.is_banned = false
      AND u.deleted_at IS NULL
      AND s.created_at >= NOW() - INTERVAL '24 hours'
  `);

  // Indexes on mv_trending_submissions
  await knex.raw(`
    CREATE UNIQUE INDEX idx_mv_trending_submissions_submission_id
    ON mv_trending_submissions (submission_id)
  `);
  await knex.raw(`
    CREATE INDEX idx_mv_trending_submissions_trending_rank
    ON mv_trending_submissions (trending_rank)
  `);
  await knex.raw(`
    CREATE INDEX idx_mv_trending_submissions_challenge_id
    ON mv_trending_submissions (challenge_id)
  `);

  // Function to refresh materialized views (can be called by a background worker)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION refresh_materialized_views()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_challenge_rankings;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_submissions;
    END;
    $$ LANGUAGE plpgsql
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS refresh_materialized_views()');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_trending_submissions');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_challenge_rankings');
}
