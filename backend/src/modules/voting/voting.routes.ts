import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { castVoteSchema, getQueueSchema } from './voting.validation';
import * as votingController from './voting.controller';

const router = Router();

// GET /voting/queue?challenge_id=X&limit=Y
router.get(
  '/queue',
  authenticate,
  validate(getQueueSchema, 'query'),
  votingController.getVoteQueue,
);

// POST /voting
router.post(
  '/',
  authenticate,
  validate(castVoteSchema),
  votingController.castVote,
);

// GET /voting/stats/:submissionId
router.get(
  '/stats/:submissionId',
  votingController.getVoteStats,
);

// GET /voting/super-votes/balance
router.get(
  '/super-votes/balance',
  authenticate,
  votingController.getSuperVoteBalance,
);

export default router;
