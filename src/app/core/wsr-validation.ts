import { z } from 'zod';

const nonNegative = z.number({ error: 'Must be a number' }).min(0, 'Cannot be negative');

/** Base shape shared by the form. Cross-field rules are enforced via
 *  superRefine so we can surface them as named field errors. */
export const wsrBaseSchema = z.object({
  sprint_id: z.string().min(1, 'Sprint is required'),
  team_id: z.string().min(1, 'Team is required'),
  sub_team_id: z.string().nullable(),
  developer_id: z.string().min(1, 'Developer is required'),

  sprint_capacity: nonNegative,
  reported_hours: nonNegative,
  leave_hours: nonNegative,
  leave_dates: z.array(z.string()).default([]),

  stories_planned: nonNegative,
  stories_delivered: nonNegative,
  story_points_planned: nonNegative,
  story_points_delivered: nonNegative,

  qa_defects: nonNegative,
  uat_defects: nonNegative,

  highlights: z.string().nullable().optional(),
  blockers: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
});

export type WsrFormShape = z.infer<typeof wsrBaseSchema>;

export interface CrossFieldWarning {
  field: string;
  message: string;
}

/**
 * Business rules that can be overridden (by an Admin) rather than hard
 * blocking the submission. Returns a list of {field, message} warnings.
 */
export function crossFieldWarnings(v: WsrFormShape): CrossFieldWarning[] {
  const warnings: CrossFieldWarning[] = [];

  if (v.stories_delivered > v.stories_planned) {
    warnings.push({ field: 'stories_delivered', message: 'Stories delivered exceeds stories planned.' });
  }
  if (v.story_points_delivered > v.story_points_planned) {
    warnings.push({
      field: 'story_points_delivered',
      message: 'Story points delivered exceeds story points planned.',
    });
  }
  if (v.leave_hours > v.sprint_capacity) {
    warnings.push({ field: 'leave_hours', message: 'Leave hours exceed sprint capacity.' });
  }
  const available = Math.max(v.sprint_capacity - v.leave_hours, 0);
  if (v.reported_hours > available * 1.1) {
    warnings.push({
      field: 'reported_hours',
      message: 'Reported hours significantly exceed available capacity — please confirm.',
    });
  }
  return warnings;
}

/** Runs the hard schema validation; throws a readable list of issues on failure. */
export function validateWsrForm(raw: unknown): { success: true; data: WsrFormShape } | { success: false; errors: Record<string, string> } {
  const result = wsrBaseSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
