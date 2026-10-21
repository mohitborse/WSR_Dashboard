import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SprintsService } from '../../core/services/sprints.service';
import { WsrService } from '../../core/services/wsr.service';
import { Sprint } from '../../core/models';
import { DeveloperSummaryComponent } from './developer-summary.component';
import { TeamsService } from '../../core/services/teams.service';
import type { Team } from '../../core/models';

@Component({
  selector: 'app-sprint-summary',
  standalone: true,
  imports: [CommonModule, DeveloperSummaryComponent],
  templateUrl: './sprint-summary.component.html',
})
export class SprintSummaryComponent implements OnInit {
  private sprintsSvc = inject(SprintsService);
  private wsrSvc = inject(WsrService);
  private teamsSvc = inject(TeamsService);

  loading = signal(true);
  sprints = signal<Sprint[]>([]);
  selectedSprintId = signal<string | null>(null);
  rows = signal<any[]>([]);
  teamCaps = signal<{ team_id: string; capacity: number }[]>([]);
  teams = signal<Team[]>([]);
  selectedTeamId = signal<string | null>(null);

  teamTotal = computed(() => {
    if (this.selectedTeamId()) {
      const t = this.teamCaps().find((c) => c.team_id === this.selectedTeamId());
      return t ? Number(t.capacity || 0) : 0;
    }
    return (this.teamCaps().reduce((s, t) => s + (t.capacity || 0), 0) || 0);
  });
  // compute per-week as half of sprint total (simple split into two weeks)
  teamPerWeek = computed(() => Math.round((this.teamTotal() || 0) / 2));

  weekActual1 = computed(() => this.week1().reduce((s, r) => s + Number(r.reported_hours || 0), 0));
  weekActual2 = computed(() => this.week2().reduce((s, r) => s + Number(r.reported_hours || 0), 0));

  // rows filtered by selected team (if any)
  filteredRows = computed(() => {
    if (!this.selectedTeamId()) return this.rows();
    return this.rows().filter((r) => r.team_id === this.selectedTeamId());
  });

  week1 = computed(() => this.filteredRows().filter((r) => (r.week_number ?? 1) === 1));
  week2 = computed(() => this.filteredRows().filter((r) => (r.week_number ?? 1) === 2));

  kpisWeek1 = computed(() => this.wsrSvc.computeKpis(this.week1() as any));
  kpisWeek2 = computed(() => this.wsrSvc.computeKpis(this.week2() as any));

  byDeveloper = computed(() => {
    const map = new Map<string, { developer_id: string; developer_name: string; rows: any[] }>();
    for (const r of this.filteredRows()) {
      const id = r.developer_id ?? r.developer_id?.toString() ?? r.developer_name ?? 'unknown';
      if (!map.has(id)) map.set(id, { developer_id: id, developer_name: r.developer_name ?? '—', rows: [] });
      map.get(id)!.rows.push(r);
    }
    return Array.from(map.values()).map((d) => {
      const storiesPlanned = d.rows.reduce((s, r) => s + Number(r.stories_planned || 0), 0);
      const storiesDelivered = d.rows.reduce((s, r) => s + Number(r.stories_delivered || 0), 0);
      const pointsPlanned = d.rows.reduce((s, r) => s + Number(r.story_points_planned || 0), 0);
      const pointsDelivered = d.rows.reduce((s, r) => s + Number(r.story_points_delivered || 0), 0);
      const reportedHours = d.rows.reduce((s, r) => s + Number(r.reported_hours || 0), 0);
      const leaveHours = d.rows.reduce((s, r) => s + Number(r.leave_hours || 0), 0);
      const highlights = d.rows.map((r) => (r.highlights || '').toString().trim()).filter(Boolean).join(' \n');
      const comments = d.rows.map((r) => (r.comments || '').toString().trim()).filter(Boolean).join(' \n');
      return {
        developer_id: d.developer_id,
        developer_name: d.developer_name,
        storiesPlanned,
        storiesDelivered,
        pointsPlanned,
        pointsDelivered,
        reportedHours,
        leaveHours,
        highlights,
        comments,
        rows: d.rows,
      };
    });
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const sprints = await this.sprintsSvc.getSprints();
    this.sprints.set(sprints);
    // load teams for filter
    try {
      const teams = await this.teamsSvc.getTeams(true);
      this.teams.set(teams);
      // default to no team filter (all teams)
      this.selectedTeamId.set(null);
    } catch (e) {
      this.teams.set([]);
    }
    this.loading.set(false);
  }

  async loadForSprint(id: string | null) {
    this.selectedSprintId.set(id);
    if (!id) {
      this.rows.set([]);
      return;
    }
    this.loading.set(true);
    try {
      const data = await this.wsrSvc.getWsrReports({ sprintId: id });
      this.rows.set(data as any[]);
      // load team capacities for display
      try {
        const caps = await this.sprintsSvc.getSprintTeamCapacities(id);
        this.teamCaps.set(caps.map((c) => ({ team_id: c.team_id, capacity: Number(c.capacity || 0) })));
      } catch (e) {
        this.teamCaps.set([]);
      }
      // clear team selection when sprint changes
      this.selectedTeamId.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  onTeamChange(val: string) {
    this.selectedTeamId.set(val || null);
  }
}
