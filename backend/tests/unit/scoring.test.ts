/**
 * Unit tests for the Wilson Score Lower Bound calculation.
 *
 * These tests exercise the pure `wilsonScore()` function in isolation --
 * no database or network calls are involved.
 */

import { wilsonScore } from '../../src/modules/voting/scoring.service';

describe('wilsonScore()', () => {
  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------

  it('returns 0 when there are no votes', () => {
    expect(wilsonScore(0, 0)).toBe(0);
  });

  it('returns 0 when both upvotes and totalVotes are 0 with superVotes', () => {
    expect(wilsonScore(0, 0, 0)).toBe(0);
  });

  it('handles the edge case of exactly 1 upvote out of 1 total', () => {
    const score = wilsonScore(1, 1);
    // With only 1 vote the lower bound of the confidence interval should
    // be positive but well below 1 due to the wide interval.
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.9);
  });

  it('handles the edge case of 1 downvote out of 1 total', () => {
    const score = wilsonScore(0, 1);
    // With 0 upvotes out of 1, the lower bound should be 0 (clamped).
    expect(score).toBe(0);
  });

  it('handles equal upvotes and downvotes', () => {
    const score = wilsonScore(50, 100);
    // 50/50 split: the lower bound should be below 0.5
    expect(score).toBeLessThan(0.5);
    expect(score).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------
  // Basic confidence behaviour
  // -------------------------------------------------------------------

  it('returns a low-confidence score when all upvotes but few votes', () => {
    const score = wilsonScore(3, 3);
    // All positive but only 3 votes -- still high uncertainty
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.8);
  });

  it('returns a high-confidence score when all upvotes with many votes', () => {
    const score = wilsonScore(200, 200);
    // All positive and many votes -- very tight interval
    expect(score).toBeGreaterThan(0.95);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('computes a reasonable score for mixed votes', () => {
    // 70% positive rate with a decent sample
    const score = wilsonScore(70, 100);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(0.8);
  });

  // -------------------------------------------------------------------
  // Super votes
  // -------------------------------------------------------------------

  it('weights super votes as 3x regular votes', () => {
    // Without super vote adjustment: 5 upvotes out of 10
    const baseScore = wilsonScore(5, 10, 0);

    // Mark 2 of those 5 upvotes as super votes (they get 2 extra weight each)
    const superScore = wilsonScore(5, 10, 2);

    // Extra positive weight should push the score higher
    expect(superScore).toBeGreaterThan(baseScore);
  });

  it('super votes improve the score compared to regular votes', () => {
    // Scenario: 10 upvotes out of 15, 0 super
    const noSuper = wilsonScore(10, 15, 0);

    // Same raw counts but 5 of those upvotes are super votes
    const withSuper = wilsonScore(10, 15, 5);

    expect(withSuper).toBeGreaterThan(noSuper);
  });

  // -------------------------------------------------------------------
  // Score increases with more positive votes (sample size awareness)
  // -------------------------------------------------------------------

  it('score increases as more positive votes are added', () => {
    const score10 = wilsonScore(10, 10);
    const score50 = wilsonScore(50, 50);
    const score100 = wilsonScore(100, 100);

    // Same positive ratio (100%) but increasing sample sizes should yield
    // progressively higher lower-bound scores.
    expect(score50).toBeGreaterThan(score10);
    expect(score100).toBeGreaterThan(score50);
  });

  it('accounts for sample size: 100/100 > 10/10 at same ratio', () => {
    const small = wilsonScore(10, 10);
    const large = wilsonScore(100, 100);

    expect(large).toBeGreaterThan(small);
  });

  it('accounts for sample size: 90/100 > 9/10 at same ratio', () => {
    const small = wilsonScore(9, 10);
    const large = wilsonScore(90, 100);

    expect(large).toBeGreaterThan(small);
  });

  // -------------------------------------------------------------------
  // Output is always clamped to [0, 1]
  // -------------------------------------------------------------------

  it('never returns a value below 0', () => {
    // Extreme negative case
    const score = wilsonScore(0, 1000);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('never returns a value above 1', () => {
    const score = wilsonScore(10000, 10000);
    expect(score).toBeLessThanOrEqual(1);
  });

  // -------------------------------------------------------------------
  // Determinism
  // -------------------------------------------------------------------

  it('returns the same value for identical inputs', () => {
    const a = wilsonScore(42, 100, 5);
    const b = wilsonScore(42, 100, 5);
    expect(a).toBe(b);
  });
});
