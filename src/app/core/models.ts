// ============================================================
// Domain models mirroring the Supabase schema
// (see supabase/migrations/0001_init.sql)
// ============================================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface Profile {
  id: string; // == auth.users.id
  full_name: string;
  email: string;
  role: UserRole;
  team_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sprint_capacity: number;
  created_at: string;
}

export interface SubTeam {
  id: string;
  team_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export type DeveloperRoleType = 'Developer' | 'QA' | 'Lead' | 'Manager';

export interface Developer {
  id: string;
  name: string;
  email: string;
  team_id: string;
  sub_team_id: string | null;
  role: DeveloperRoleType;
  active: boolean;
  default_sprint_capacity: number;
  joining_date: string | null;
  manager_id: string | null;
  created_at: string;
}

export type SprintStatus = 'Planned' | 'Active' | 'Completed' | 'Closed';

export interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  capacity: number;
  status: SprintStatus;
  created_at: string;
}

export interface SprintTeamCapacity {
  sprint_id: string;
  team_id: string;
  capacity: number;
}

export type WsrStatus = 'Draft' | 'Submitted';

export interface WsrReport {
  id: string;
  sprint_id: string;
  developer_id: string;
  team_id: string;
  sub_team_id: string | null;
  week_number?: number;
  start_date?: string;
  end_date?: string;

  sprint_capacity: number;
  reported_hours: number;
  leave_hours: number;
  leave_dates: string[]; // array of ISO date strings

  stories_planned: number;
  stories_delivered: number;

  story_points_planned: number;
  story_points_delivered: number;

  qa_defects: number;
  uat_defects: number;

  highlights: string | null;
  blockers: string | null;
  comments: string | null;

  status: WsrStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Joined shape used across the dashboard/table/report views
export interface WsrReportView extends WsrReport {
  developer_name: string;
  team_name: string;
  sub_team_name: string | null;
  sprint_name: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

// ============================================================
// Centralized business-logic calculations (kept in one place
// so the form, dashboard, and report page never diverge)
// ============================================================

export function availableCapacity(sprintCapacity: number, leaveHours: number): number {
  const val = (sprintCapacity || 0) - (leaveHours || 0);
  return val < 0 ? 0 : val;
}

export function safeRatio(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return (numerator || 0) / denominator;
}

export function utilizationPct(reportedHours: number, sprintCapacity: number, leaveHours: number): number {
  const avail = availableCapacity(sprintCapacity, leaveHours);
  return round1(safeRatio(reportedHours, avail) * 100);
}

export function storyDeliveryPct(delivered: number, planned: number): number {
  return round1(safeRatio(delivered, planned) * 100);
}

export function storyPointDeliveryPct(delivered: number, planned: number): number {
  return round1(safeRatio(delivered, planned) * 100);
}

export function qaDefectRate(qaDefects: number, storiesDelivered: number): number {
  return round2(safeRatio(qaDefects, storiesDelivered));
}

export function uatDefectRate(uatDefects: number, storiesDelivered: number): number {
  return round2(safeRatio(uatDefects, storiesDelivered));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type StatusLevel = 'good' | 'warning' | 'risk';

/** Simple, explainable status rule used by StatusBadge across the app. */
export function utilizationStatus(utilization: number): StatusLevel {
  if (utilization >= 80) return 'good';
  if (utilization >= 60) return 'warning';
  return 'risk';
}

export function deliveryStatus(deliveryPct: number): StatusLevel {
  if (deliveryPct >= 90) return 'good';
  if (deliveryPct >= 70) return 'warning';
  return 'risk';
}
