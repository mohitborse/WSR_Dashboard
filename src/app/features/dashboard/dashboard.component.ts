import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DeveloperCardComponent } from '../../shared/developer-card.component';
import { AuthService } from '../../core/auth.service';
import { Developer, Sprint, SubTeam, Team, WsrReportView, utilizationStatus } from '../../core/models';
import { TeamsService } from '../../core/services/teams.service';
import { DevelopersService } from '../../core/services/developers.service';
import { SprintsService } from '../../core/services/sprints.service';
import { WsrService } from '../../core/services/wsr.service';

const STORAGE_KEY = 'wsr-dashboard-filters';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DeveloperCardComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  sprints = signal<Sprint[]>([]);
  teams = signal<Team[]>([]);
  subTeams = signal<SubTeam[]>([]);
  developers = signal<Developer[]>([]);
  reports = signal<WsrReportView[]>([]);

  // filters (persisted across navigation, per UX requirement)
  sprintId = signal<string>('');
  teamId = signal<string>('');
  subTeamId = signal<string>('');
  developerId = signal<string>('');

  filteredSubTeams = computed(() => this.subTeams().filter((st) => !this.teamId() || st.team_id === this.teamId()));
  filteredDevelopers = computed(() =>
    this.developers().filter((d) => {
      if (this.teamId() && d.team_id !== this.teamId()) return false;
      if (this.subTeamId() && d.sub_team_id !== this.subTeamId()) return false;
      return true;
    })
  );

  filteredReports = computed(() =>
    this.reports().filter((r) => {
      if (this.subTeamId() && r.sub_team_id !== this.subTeamId()) return false;
      if (this.developerId() && r.developer_id !== this.developerId()) return false;
      return true;
    })
  );

  kpis = computed(() => this.wsrSvc.computeKpis(this.filteredReports()));
  overallUtilLevel = computed(() => utilizationStatus(this.kpis().utilizationPct));

  constructor(
    public auth: AuthService,
    private teamsSvc: TeamsService,
    private devSvc: DevelopersService,
    private sprintsSvc: SprintsService,
    private wsrSvc: WsrService
  ) {
    console.log('auth session', this.auth.session()?.user.email);
  }

  async ngOnInit(): Promise<void> {
    this.restoreFilters();
    this.loading.set(true);
    try {
      const [sprints, teams, subTeams, developers] = await Promise.all([
        this.sprintsSvc.getSprints(),
        this.teamsSvc.getTeams(true),
        this.teamsSvc.getSubTeams(undefined, true),
        this.devSvc.getDevelopers({ activeOnly: true }),
      ]);
      this.sprints.set(sprints);
      this.teams.set(teams);
      this.subTeams.set(subTeams);
      this.developers.set(developers);

      const loginDeveloper = this.developers().find((d) => d.email == this.auth.session()?.user.email);

      if (!this.sprintId()) {
        const active = sprints.find((s) => s.status === 'Active') ?? sprints[0];
        if (active) this.sprintId.set(active.id);
      }

      await this.reload();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to load dashboard data.');
    } finally {
      this.loading.set(false);
    }
  }

  async reload(): Promise<void> {
    this.persistFilters();
    const rows = await this.wsrSvc.getWsrReports({
      sprintId: this.sprintId() || undefined,
      teamId: this.teamId() || undefined,
    });
    this.reports.set(rows);
  }

  onTeamChange(): void {
    this.subTeamId.set('');
    this.developerId.set('');
    this.persistFilters();
  }

  onSubTeamChange(): void {
    this.developerId.set('');
    this.persistFilters();
  }

  clearFilters(): void {
    this.teamId.set('');
    this.subTeamId.set('');
    this.developerId.set('');
    this.persistFilters();
  }

  private persistFilters(): void {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sprintId: this.sprintId(),
          teamId: this.teamId(),
          subTeamId: this.subTeamId(),
          developerId: this.developerId(),
        })
      );
    } catch {
      /* sessionStorage may be unavailable — non-fatal */
    }
  }

  private restoreFilters(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.sprintId.set(parsed.sprintId ?? '');
      this.teamId.set(parsed.teamId ?? '');
      this.subTeamId.set(parsed.subTeamId ?? '');
      this.developerId.set(parsed.developerId ?? '');
    } catch {
      /* ignore malformed/absent state */
    }
  }
}
