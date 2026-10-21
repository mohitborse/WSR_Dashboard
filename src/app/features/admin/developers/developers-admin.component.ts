import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Developer, DeveloperRoleType, SubTeam, Team } from '../../../core/models';
import { DevelopersService } from '../../../core/services/developers.service';
import { TeamsService } from '../../../core/services/teams.service';

interface DevDraft {
  name: string;
  email: string;
  team_id: string;
  sub_team_id: string;
  role: DeveloperRoleType;
  default_sprint_capacity: number;
  joining_date: string;
}

const emptyDraft = (): DevDraft => ({
  name: '',
  email: '',
  team_id: '',
  sub_team_id: '',
  role: 'Developer',
  default_sprint_capacity: 40,
  joining_date: '',
});

@Component({
  selector: 'app-developers-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './developers-admin.component.html',
})
export class DevelopersAdminComponent implements OnInit {
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  saving = signal(false);

  developers = signal<Developer[]>([]);
  teams = signal<Team[]>([]);
  subTeams = signal<SubTeam[]>([]);

  editingId = signal<string | null>(null);
  draft = signal<DevDraft>(emptyDraft());

  roles: DeveloperRoleType[] = ['Developer', 'QA', 'Lead', 'Manager'];

  draftSubTeams = computed(() => this.subTeams().filter((st) => st.team_id === this.draft().team_id));

  constructor(private devSvc: DevelopersService, private teamsSvc: TeamsService) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const [developers, teams, subTeams] = await Promise.all([
        this.devSvc.getDevelopers(),
        this.teamsSvc.getTeams(true),
        this.teamsSvc.getSubTeams(),
      ]);
      this.developers.set(developers);
      this.teams.set(teams);
      this.subTeams.set(subTeams);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to load developers.');
    } finally {
      this.loading.set(false);
    }
  }

  teamName(id: string): string {
    return this.teams().find((t) => t.id === id)?.name ?? '—';
  }
  subTeamName(id: string | null): string {
    if (!id) return '—';
    return this.subTeams().find((st) => st.id === id)?.name ?? '—';
  }

  updateDraft<K extends keyof DevDraft>(key: K, value: DevDraft[K]): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (key === 'team_id') this.draft.set({ ...this.draft(), sub_team_id: '' });
  }

  startCreate(): void {
    this.editingId.set('new');
    this.draft.set(emptyDraft());
  }

  startEdit(d: Developer): void {
    this.editingId.set(d.id);
    this.draft.set({
      name: d.name,
      email: d.email,
      team_id: d.team_id,
      sub_team_id: d.sub_team_id ?? '',
      role: d.role,
      default_sprint_capacity: d.default_sprint_capacity,
      joining_date: d.joining_date ?? '',
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set(emptyDraft());
  }

  async save(): Promise<void> {
    const d = this.draft();
    if (!d.name.trim() || !d.email.trim() || !d.team_id) {
      this.errorMsg.set('Name, email and team are required.');
      return;
    }
    this.errorMsg.set(null);
    this.saving.set(true);
    try {
      const payload = {
        name: d.name.trim(),
        email: d.email.trim(),
        team_id: d.team_id,
        sub_team_id: d.sub_team_id || null,
        role: d.role,
        active: true,
        default_sprint_capacity: d.default_sprint_capacity,
        joining_date: d.joining_date || null,
        manager_id: null,
      };
      if (this.editingId() && this.editingId() !== 'new') {
        await this.devSvc.updateDeveloper(this.editingId()!, payload);
      } else {
        await this.devSvc.createDeveloper(payload as any);
      }
      this.cancelEdit();
      await this.reload();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to save developer.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(d: Developer): Promise<void> {
    await this.devSvc.updateDeveloper(d.id, { active: !d.active });
    await this.reload();
  }
}
