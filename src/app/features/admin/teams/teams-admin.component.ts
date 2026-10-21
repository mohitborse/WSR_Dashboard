import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTeam, Team } from '../../../core/models';
import { TeamsService } from '../../../core/services/teams.service';

@Component({
  selector: 'app-teams-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teams-admin.component.html',
})
export class TeamsAdminComponent implements OnInit {
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  teams = signal<Team[]>([]);
  subTeams = signal<SubTeam[]>([]);

  newTeamName = signal('');
  newTeamDesc = signal('');

  selectedTeamId = signal<string>('');
  newSubTeamName = signal('');

  subTeamsForSelected = computed(() => this.subTeams().filter((st) => st.team_id === this.selectedTeamId()));
  selectedTeamName = computed(() => this.teams().find((t) => t.id === this.selectedTeamId())?.name ?? '');
  selectedTeamCapacity = computed(() => this.teams().find((t) => t.id === this.selectedTeamId())?.sprint_capacity ?? 0);

  constructor(private teamsSvc: TeamsService) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const [teams, subTeams] = await Promise.all([this.teamsSvc.getTeams(), this.teamsSvc.getSubTeams()]);
      this.teams.set(teams);
      this.subTeams.set(subTeams);
      if (!this.selectedTeamId() && teams.length) this.selectedTeamId.set(teams[0].id);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to load teams.');
    } finally {
      this.loading.set(false);
    }
  }

  async addTeam(): Promise<void> {
    const name = this.newTeamName().trim();
    if (!name) return;
    try {
      await this.teamsSvc.createTeam(name, this.newTeamDesc().trim() || null);
      this.newTeamName.set('');
      this.newTeamDesc.set('');
      await this.reload();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to create team.');
    }
  }

  async toggleTeamActive(team: Team): Promise<void> {
    await this.teamsSvc.updateTeam(team.id, { active: !team.active });
    await this.reload();
  }

  async addSubTeam(): Promise<void> {
    const name = this.newSubTeamName().trim();
    if (!name || !this.selectedTeamId()) return;
    try {
      await this.teamsSvc.createSubTeam(this.selectedTeamId(), name);
      this.newSubTeamName.set('');
      await this.reload();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to create sub-team.');
    }
  }

  async toggleSubTeamActive(st: SubTeam): Promise<void> {
    await this.teamsSvc.updateSubTeam(st.id, { active: !st.active });
    await this.reload();
  }
}
