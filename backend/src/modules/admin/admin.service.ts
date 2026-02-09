import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError, ValidationError } from '../../shared/errors';
import {
  type PaginationParams,
  type PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardStats {
  total_users: number;
  active_today: number;
  submissions_today: number;
  revenue_this_month: number;
  total_challenges: number;
  pending_moderation: number;
  open_reports: number;
}

export interface UserFilters {
  role?: string;
  subscription_tier?: string;
  is_banned?: boolean;
  search?: string;
}

export interface ModerationAction {
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface CreateChallengeData {
  title: string;
  description: string;
  category?: string;
  starts_at: string;
  ends_at: string;
  voting_ends_at: string;
  is_premium_early_access?: boolean;
  thumbnail_url?: string;
}

export interface UpdateChallengeData {
  title?: string;
  description?: string;
  category?: string;
  starts_at?: string;
  ends_at?: string;
  voting_ends_at?: string;
  status?: string;
  is_premium_early_access?: boolean;
  thumbnail_url?: string;
}

export interface AnalyticsRow {
  date: string;
  new_users: number;
  active_users: number;
  new_submissions: number;
  total_votes: number;
  total_gifts: number;
  coin_purchases: number;
  subscription_revenue: number;
  coin_revenue: number;
  ad_impressions: number;
  estimated_ad_revenue: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * Returns high-level dashboard statistics for the admin overview.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthISO = monthStart.toISOString();

  const [
    totalUsersResult,
    activeTodayResult,
    submissionsTodayResult,
    subscriptionRevenueResult,
    coinRevenueResult,
    totalChallengesResult,
    pendingModerationResult,
    openReportsResult,
  ] = await Promise.all([
    db('users').whereNull('deleted_at').count('id as count'),

    // Active today: users who submitted or voted today
    db.raw(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT user_id FROM submissions WHERE created_at >= ?
        UNION
        SELECT user_id FROM votes WHERE created_at >= ?
      ) AS active
    `, [todayISO, todayISO]),

    db('submissions').where('created_at', '>=', todayISO).count('id as count'),

    db('subscription_payments')
      .where('status', 'completed')
      .where('created_at', '>=', monthISO)
      .sum('amount as total'),

    db('coin_transactions')
      .where('type', 'purchase')
      .where('created_at', '>=', monthISO)
      .sum('amount as total'),

    db('challenges').count('id as count'),

    db('submissions')
      .whereIn('moderation_status', ['pending', 'manual_review'])
      .count('id as count'),

    db('reports').where('status', 'open').count('id as count'),
  ]);

  const subscriptionRevenue = Number(subscriptionRevenueResult[0]?.total) || 0;
  const coinRevenue = Number(coinRevenueResult[0]?.total) || 0;

  return {
    total_users: Number(totalUsersResult[0].count),
    active_today: Number(activeTodayResult.rows?.[0]?.count ?? activeTodayResult[0]?.count ?? 0),
    submissions_today: Number(submissionsTodayResult[0].count),
    revenue_this_month: subscriptionRevenue + coinRevenue,
    total_challenges: Number(totalChallengesResult[0].count),
    pending_moderation: Number(pendingModerationResult[0].count),
    open_reports: Number(openReportsResult[0].count),
  };
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of users with optional filters.
 */
export async function getUsers(
  pagination: PaginationParams,
  filters?: UserFilters,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  let query = db('users').whereNull('deleted_at');

  if (filters?.role) {
    query = query.where('role', filters.role);
  }

  if (filters?.subscription_tier) {
    query = query.where('subscription_tier', filters.subscription_tier);
  }

  if (filters?.is_banned !== undefined) {
    query = query.where('is_banned', filters.is_banned);
  }

  if (filters?.search) {
    const pattern = `%${filters.search}%`;
    query = query.where(function () {
      this.whereILike('username', pattern)
        .orWhereILike('display_name', pattern)
        .orWhereILike('email', pattern);
    });
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const data = await query
    .clone()
    .select(
      'id',
      'username',
      'email',
      'display_name',
      'avatar_url',
      'role',
      'subscription_tier',
      'is_banned',
      'ban_reason',
      'followers_count',
      'submissions_count',
      'created_at',
    )
    .orderBy(pagination.sort_by || 'created_at', pagination.sort_order || 'desc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Bans a user by setting is_banned and recording the reason.
 *
 * @throws NotFoundError if the user does not exist.
 */
export async function banUser(
  userId: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const user = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id', 'role');

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  if (user.role === 'admin') {
    throw new ValidationError('Cannot ban an admin user');
  }

  const [updated] = await db('users')
    .where('id', userId)
    .update({
      is_banned: true,
      ban_reason: reason,
      updated_at: db.fn.now(),
    })
    .returning(['id', 'username', 'email', 'is_banned', 'ban_reason', 'updated_at']);

  logger.info('User banned', { userId, reason });

  return updated;
}

/**
 * Unbans a user.
 *
 * @throws NotFoundError if the user does not exist.
 */
export async function unbanUser(userId: string): Promise<Record<string, unknown>> {
  const user = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id');

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  const [updated] = await db('users')
    .where('id', userId)
    .update({
      is_banned: false,
      ban_reason: null,
      updated_at: db.fn.now(),
    })
    .returning(['id', 'username', 'email', 'is_banned', 'ban_reason', 'updated_at']);

  logger.info('User unbanned', { userId });

  return updated;
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

/**
 * Returns paginated submissions with pending or manual_review moderation status.
 */
export async function getModerationQueue(
  pagination: PaginationParams,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  const baseQuery = db('submissions')
    .whereIn('moderation_status', ['pending', 'manual_review']);

  const [{ count }] = await baseQuery.clone().count('id as count');
  const total = Number(count);

  const data = await baseQuery
    .clone()
    .select(
      'submissions.id',
      'submissions.user_id',
      'submissions.challenge_id',
      'submissions.video_url',
      'submissions.thumbnail_url',
      'submissions.caption',
      'submissions.moderation_status',
      'submissions.created_at',
      'users.username',
      'users.display_name',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .orderBy('submissions.created_at', 'asc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Updates the moderation status of a submission.
 *
 * @throws NotFoundError if the submission does not exist.
 * @throws ValidationError if the status is invalid.
 */
export async function moderateSubmission(
  submissionId: string,
  action: ModerationAction,
): Promise<Record<string, unknown>> {
  const validStatuses = ['approved', 'rejected'];

  if (!validStatuses.includes(action.status)) {
    throw new ValidationError(
      `Invalid moderation status '${action.status}'. Must be one of: ${validStatuses.join(', ')}`,
    );
  }

  const submission = await db('submissions')
    .where('id', submissionId)
    .first('id', 'user_id');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  const updateData: Record<string, unknown> = {
    moderation_status: action.status,
    updated_at: db.fn.now(),
  };

  if (action.reason) {
    updateData.moderation_reason = action.reason;
  }

  const [updated] = await db('submissions')
    .where('id', submissionId)
    .update(updateData)
    .returning('*');

  // Notify the user
  await db('notifications').insert({
    user_id: submission.user_id,
    type: action.status === 'approved' ? 'submission_approved' : 'submission_rejected',
    title: action.status === 'approved' ? 'Submission Approved' : 'Submission Rejected',
    body: action.status === 'approved'
      ? 'Your submission has been approved and is now visible.'
      : `Your submission was rejected.${action.reason ? ` Reason: ${action.reason}` : ''}`,
    data: JSON.stringify({ submission_id: submissionId }),
    created_at: db.fn.now(),
  });

  logger.info('Submission moderated', {
    submissionId,
    status: action.status,
    reason: action.reason,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/**
 * Returns paginated reports with optional status filter.
 */
export async function getReports(
  pagination: PaginationParams,
  status?: string,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  let query = db('reports');

  if (status) {
    query = query.where('reports.status', status);
  }

  const [{ count }] = await query.clone().count('reports.id as count');
  const total = Number(count);

  const data = await query
    .clone()
    .select(
      'reports.*',
      'reporter.username as reporter_username',
      'reporter.display_name as reporter_display_name',
    )
    .leftJoin('users as reporter', 'reports.reporter_id', 'reporter.id')
    .orderBy('reports.created_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Resolves a report by setting its status, admin resolver, and resolution note.
 *
 * @throws NotFoundError if the report does not exist.
 */
export async function resolveReport(
  reportId: string,
  adminId: string,
  resolutionNote: string,
): Promise<Record<string, unknown>> {
  const report = await db('reports').where('id', reportId).first('id', 'status');

  if (!report) {
    throw new NotFoundError('Report', reportId);
  }

  if (report.status === 'resolved') {
    throw new ValidationError('This report has already been resolved');
  }

  const [updated] = await db('reports')
    .where('id', reportId)
    .update({
      status: 'resolved',
      resolved_by: adminId,
      resolution_note: resolutionNote,
      resolved_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  logger.info('Report resolved', { reportId, adminId });

  return updated;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/**
 * Returns daily_stats rows for the given date range.
 */
export async function getAnalytics(
  startDate: string,
  endDate: string,
): Promise<AnalyticsRow[]> {
  const rows = await db('daily_stats')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'asc');

  return rows as AnalyticsRow[];
}

// ---------------------------------------------------------------------------
// Challenge management
// ---------------------------------------------------------------------------

/**
 * Creates a new challenge.
 */
export async function createChallenge(
  data: CreateChallengeData,
): Promise<Record<string, unknown>> {
  // Validate dates
  const startsAt = new Date(data.starts_at);
  const endsAt = new Date(data.ends_at);
  const votingEndsAt = new Date(data.voting_ends_at);

  if (endsAt <= startsAt) {
    throw new ValidationError('ends_at must be after starts_at');
  }

  if (votingEndsAt <= endsAt) {
    throw new ValidationError('voting_ends_at must be after ends_at');
  }

  const [challenge] = await db('challenges')
    .insert({
      title: data.title,
      description: data.description,
      category: data.category ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      voting_ends_at: data.voting_ends_at,
      is_premium_early_access: data.is_premium_early_access ?? false,
      thumbnail_url: data.thumbnail_url ?? null,
      status: 'scheduled',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  logger.info('Challenge created by admin', { challengeId: challenge.id, title: data.title });

  return challenge;
}

/**
 * Updates an existing challenge.
 *
 * @throws NotFoundError if the challenge does not exist.
 */
export async function updateChallenge(
  id: string,
  data: UpdateChallengeData,
): Promise<Record<string, unknown>> {
  const existing = await db('challenges').where('id', id).first('id');

  if (!existing) {
    throw new NotFoundError('Challenge', id);
  }

  // Build update payload, only including provided fields
  const updatePayload: Record<string, unknown> = {
    updated_at: db.fn.now(),
  };

  const allowedFields: (keyof UpdateChallengeData)[] = [
    'title',
    'description',
    'category',
    'starts_at',
    'ends_at',
    'voting_ends_at',
    'status',
    'is_premium_early_access',
    'thumbnail_url',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updatePayload[field] = data[field];
    }
  }

  // If dates are being updated, validate them
  if (data.starts_at || data.ends_at || data.voting_ends_at) {
    const current = await db('challenges').where('id', id).first();
    const startsAt = new Date(data.starts_at ?? current.starts_at);
    const endsAt = new Date(data.ends_at ?? current.ends_at);
    const votingEndsAt = new Date(data.voting_ends_at ?? current.voting_ends_at);

    if (endsAt <= startsAt) {
      throw new ValidationError('ends_at must be after starts_at');
    }

    if (votingEndsAt <= endsAt) {
      throw new ValidationError('voting_ends_at must be after ends_at');
    }
  }

  const [updated] = await db('challenges')
    .where('id', id)
    .update(updatePayload)
    .returning('*');

  logger.info('Challenge updated by admin', { challengeId: id });

  return updated;
}
