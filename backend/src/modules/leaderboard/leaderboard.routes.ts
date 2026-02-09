import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as leaderboardController from './leaderboard.controller';

const router = Router();

// GET /leaderboards/top-creators
// NOTE: Placed before /:challengeId routes to avoid param collision
router.get(
  '/top-creators',
  leaderboardController.getTopCreators,
);

// GET /leaderboards/challenge/:challengeId
router.get(
  '/challenge/:challengeId',
  leaderboardController.getChallengeLeaderboard,
);

// GET /leaderboards/challenge/:challengeId/me
router.get(
  '/challenge/:challengeId/me',
  authenticate,
  leaderboardController.getUserRank,
);

// GET /leaderboards/challenge/:challengeId/friends
router.get(
  '/challenge/:challengeId/friends',
  authenticate,
  leaderboardController.getFriendsLeaderboard,
);

export default router;
