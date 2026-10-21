import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SprintsService } from '../../core/services/sprints.service';
import { WsrService } from '../../core/services/wsr.service';
import { TeamsService } from '../../core/services/teams.service';
import { DeveloperSummaryComponent } from './developer-summary.component';
import type { Sprint, Team } from '../../core/models';

@Component({
  selector: 'app-developer-summaries',
  standalone: true,
  imports: [CommonModule, DeveloperSummaryComponent],
  templateUrl: './developer-summaries.component.html',
})
export class DeveloperSummariesComponent implements OnInit {
  private sprintsSvc = inject(SprintsService);
  private wsrSvc = inject(WsrService);
  private teamsSvc = inject(TeamsService);

  loading = signal(true);
  sprints = signal<Sprint[]>([]);
  teams = signal<Team[]>([]);
  selectedSprintId = signal<string | null>(null);
  selectedTeamId = signal<string | null>(null);
  rows = signal<any[]>([]);

  filteredRows = computed(() => {
    if (!this.selectedTeamId()) return this.rows();
    return this.rows().filter((r) => r.team_id === this.selectedTeamId());
  });

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
      const blockers = d.rows.map((r) => (r.blockers || '').toString().trim()).filter(Boolean).join(' \n');
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
        blockers,
        rows: d.rows,
      };
    });
  });

  devsWithBlockers = computed(() => this.byDeveloper().filter((d) => Boolean(d.blockers)));
  devsWithHighlights = computed(() => this.byDeveloper().filter((d) => Boolean(d.comments)));
  devsWithTasks = computed(() => this.byDeveloper().filter((d) => Boolean(d.highlights || d.comments)));

  copyMessage = signal<string | null>(null);

  private showCopyMessage(msg: string, ms = 3000) {
    this.copyMessage.set(msg);
    setTimeout(() => this.copyMessage.set(null), ms);
  }

  async copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text || '');
      this.showCopyMessage('Copied to clipboard');
    } catch (e) {
      console.error('Copy failed', e);
      this.showCopyMessage('Copy failed');
    }
  }

  copyTasks() {
    const lines: string[] = [];
    for (const d of this.byDeveloper()) {
      lines.push(d.developer_name || '—');
      lines.push('Task:');
      // prefer highlights, then comments, then a placeholder
      lines.push(d.highlights || d.comments || '');
      lines.push('');
    }
    this.copyText(lines.join('\n'));
  }

  copyBlockers() {
    const lines: string[] = [];
    for (const d of this.byDeveloper()) {
      if (!d.blockers) continue;
      lines.push(d.developer_name || '—');
      lines.push('Blocker:');
      lines.push(d.blockers);
      lines.push('');
    }
    this.copyText(lines.join('\n'));
  }

  copyHighlights() {
    const lines: string[] = [];
    for (const d of this.byDeveloper()) {
      if (!d.highlights) continue;
      lines.push(d.developer_name || '—');
      lines.push('Highlight:');
      lines.push(d.highlights);
      lines.push('');
    }
    this.copyText(lines.join('\n'));
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const [sprints, teams] = await Promise.all([
      this.sprintsSvc.getSprints(),
      this.teamsSvc.getTeams(true),
    ]);
    this.sprints.set(sprints);
    this.teams.set(teams);
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
      this.selectedTeamId.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
