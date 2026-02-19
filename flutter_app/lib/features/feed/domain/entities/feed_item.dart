// The feed feature works with [Submission] objects from the challenge domain.
//
// Rather than duplicating the entity, we re-export it so that feed-layer code
// can import from a feed-local path while still using the canonical type.
export '../../../challenge/domain/submission.dart' show Submission;
