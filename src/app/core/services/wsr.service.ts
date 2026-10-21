import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { WsrReport, WsrReportView, WsrStatus, utilizationPct, storyDeliveryPct, storyPointDeliveryPct } from '../models';

export interface WsrFilters {
  sprintId?: string;
  teamId?: string;
  subTeamId?: string;
  developerId?: string;
}

export type WsrUpsertInput = Omit<WsrReport, 'id' | 'created_at' | 'updated_at'> & { id?: string };

// Joined select used everywhere we need names alongside the raw row.
const JOINED_SELECT = `
  *,
  developers:developer_id ( name ),
  teams:team_id ( name ),
  sub_teams:sub_team_id ( name ),
  sprints:sprint_id ( name )
`;

function toView(row: any): WsrReportView {
  return {
    ...row,
    developer_name: row.developers?.name ?? '—',
    team_name: row.teams?.name ?? '—',
    sub_team_name: row.sub_teams?.name ?? null,
    sprint_name: row.sprints?.name ?? '—',
  };
}

@Injectable({ providedIn: 'root' })
export class WsrService {
  constructor(private supabase: SupabaseService) {}

  async getWsrReports(filters: WsrFilters = {}): Promise<WsrReportView[]> {
    let query = this.supabase.client.from('wsr_reports').select(JOINED_SELECT);
    if (filters.sprintId) query = query.eq('sprint_id', filters.sprintId);
    if (filters.teamId) query = query.eq('team_id', filters.teamId);
    if (filters.subTeamId) query = query.eq('sub_team_id', filters.subTeamId);
    if (filters.developerId) query = query.eq('developer_id', filters.developerId);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toView);
  }

  async getWsrReport(id: string): Promise<WsrReportView | null> {
    const { data, error } = await this.supabase.client
      .from('wsr_reports')
      .select(JOINED_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toView(data) : null;
  }

  
    /** Look up an existing report for this developer + sprint + week. */
    async findExisting(developerId: string, sprintId: string, weekNumber = 1): Promise<WsrReport | null> {
      const { data, error } = await this.supabase.client
        .from('wsr_reports')
        .select('*')
        .eq('developer_id', developerId)
        .eq('sprint_id', sprintId)
        .eq('week_number', weekNumber)
        .maybeSingle();
      if (error) throw error;
      return data as WsrReport | null;
    }

  /**
   * Insert or update a WSR report. Relies on the DB unique constraint
   * (developer_id, sprint_id) — see migration 0001 — to prevent duplicate
   * entries; passing an `id` always updates that exact row (used when the
   * caller already resolved the existing record, e.g. via findExisting()).
   */
  async upsert(input: WsrUpsertInput): Promise<WsrReport> {
    const { id, ...payload } = input;

    if (id) {
      const { data, error } = await this.supabase.client
        .from('wsr_reports')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WsrReport;
    }

      const { data, error } = await this.supabase.client
        .from('wsr_reports')
        .upsert(payload, { onConflict: 'developer_id,sprint_id,week_number' })
        .select('*')
        .single();
    if (error) throw error;
    return data as WsrReport;
  }

  async setStatus(id: string, status: WsrStatus): Promise<void> {
    const { error } = await this.supabase.client.from('wsr_reports').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('wsr_reports').delete().eq('id', id);
    if (error) throw error;
  }

  /** Duplicates a report as a fresh Draft (e.g. to reuse as a starting point
   *  for the same developer in a different sprint). Caller must supply the
   *  target sprint since (developer_id, sprint_id) must stay unique. */
  async duplicateToSprint(sourceId: string, targetSprintId: string): Promise<WsrReport> {
    const source = await this.getWsrReport(sourceId);
    if (!source) throw new Error('Source WSR report not found');

    const {
      id, created_at, updated_at, developer_name, team_name, sub_team_name, sprint_name,
      ...rest
    } = source as any;

    return this.upsert({ ...rest, sprint_id: targetSprintId, status: 'Draft' });
  }

  /** Aggregate KPI totals + rates for a set of report rows (dashboard cards). */
  computeKpis(rows: WsrReportView[]) {
    const totals = rows.reduce(
      (acc, r) => {
        acc.capacity += r.sprint_capacity || 0;
        acc.leave += r.leave_hours || 0;
        acc.reportedHours += r.reported_hours || 0;
        acc.storiesPlanned += r.stories_planned || 0;
        acc.storiesDelivered += r.stories_delivered || 0;
        acc.pointsPlanned += r.story_points_planned || 0;
        acc.pointsDelivered += r.story_points_delivered || 0;
        acc.qaDefects += r.qa_defects || 0;
        acc.uatDefects += r.uat_defects || 0;
        return acc;
      },
      {
        capacity: 0,
        leave: 0,
        reportedHours: 0,
        storiesPlanned: 0,
        storiesDelivered: 0,
        pointsPlanned: 0,
        pointsDelivered: 0,
        qaDefects: 0,
        uatDefects: 0,
      }
    );

    return {
      developers: new Set(rows.map((r) => r.developer_id)).size,
      ...totals,
      utilizationPct: utilizationPct(totals.reportedHours, totals.capacity, totals.leave),
      storyDeliveryPct: storyDeliveryPct(totals.storiesDelivered, totals.storiesPlanned),
      storyPointDeliveryPct: storyPointDeliveryPct(totals.pointsDelivered, totals.pointsPlanned),
    };
  }
}
