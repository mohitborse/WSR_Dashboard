import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sprint, SprintStatus, SprintTeamCapacity, Team } from '../../../core/models';
import { SprintsService } from '../../../core/services/sprints.service';
import { TeamsService } from '../../../core/services/teams.service';

interface SprintDraft {
  name: string;
  start_date: string;
  end_date: string;
  capacity: number;
  capacityByTeam: Record<string, number>;
  status: SprintStatus;
}

const emptyDraft = (teams: Team[] = []): SprintDraft => ({
  name: '',
  start_date: '',
  end_date: '',
  capacity: 320,
  capacityByTeam: teams.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {} as Record<string, number>),
  status: 'Planned',
});

@Component({
  selector: 'app-sprints-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sprints-admin.component.html',
})
export class SprintsAdminComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  sprints = signal<Sprint[]>([]);
  editingId = signal<string | null>(null);
  draft = signal<SprintDraft>(emptyDraft());

  statuses: SprintStatus[] = ['Planned', 'Active', 'Completed', 'Closed'];

  teams = signal<Team[]>([]);

  constructor(private sprintsSvc: SprintsService, private teamsSvc: TeamsService) {}

  async ngOnInit(): Promise<void> {
    const [sprints, teams] = await Promise.all([this.sprintsSvc.getSprints(), this.teamsSvc.getTeams(true)]);
    this.sprints.set(sprints);
    this.teams.set(teams);
    this.loading.set(false);
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.sprints.set(await this.sprintsSvc.getSprints());
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to load sprints.');
    } finally {
      this.loading.set(false);
    }
  }

  updateDraft<K extends keyof SprintDraft>(key: K, value: SprintDraft[K]): void {
    this.draft.set({ ...this.draft(), [key]: value });
  }

  // helper for template: update single team's capacity in the draft
  updateTeamCapacity(teamId: string, capacity: number): void {
    const byTeam = { ...(this.draft().capacityByTeam || {}) } as Record<string, number>;
    byTeam[teamId] = Number(capacity) || 0;
    this.draft.set({ ...this.draft(), capacityByTeam: byTeam });
  }

  draftCapacity(teamId: string): number {
    return (this.draft().capacityByTeam && this.draft().capacityByTeam[teamId]) || 0;
  }

  startCreate(): void {
    this.editingId.set('new');
    this.draft.set(emptyDraft(this.teams()));
  }

  startEdit(s: Sprint): void {
    this.editingId.set(s.id);
    // prefill draft with existing sprint and team capacities
    this.draft.set({
      name: s.name,
      start_date: s.start_date,
      end_date: s.end_date,
      capacity: s.capacity,
      capacityByTeam: this.teams().reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {} as Record<string, number>),
      status: s.status,
    });

    // load team capacities for this sprint
    this.sprintsSvc.getSprintTeamCapacities(s.id).then((rows) => {
      const byTeam: Record<string, number> = this.draft().capacityByTeam || {};
      rows.forEach((r) => (byTeam[r.team_id] = r.capacity));
      this.draft.set({ ...this.draft(), capacityByTeam: byTeam });
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set(emptyDraft());
  }

  async save(): Promise<void> {
    const d = this.draft();
    if (!d.name.trim() || !d.start_date || !d.end_date) {
      this.errorMsg.set('Sprint name, start date and end date are required.');
      return;
    }
    if (d.end_date < d.start_date) {
      this.errorMsg.set('End date must be on or after the start date.');
      return;
    }
    this.errorMsg.set(null);
    this.saving.set(true);
    try {
      let sprint: Sprint;
      const sprintPayload = {
        name: d.name.trim(),
        start_date: d.start_date,
        end_date: d.end_date,
        capacity: d.capacity,
        status: d.status,
      };
      if (this.editingId() && this.editingId() !== 'new') {
        sprint = await this.sprintsSvc.updateSprint(this.editingId()!, sprintPayload);
      } else {
        sprint = await this.sprintsSvc.createSprint(sprintPayload);
      }
      // persist team capacities
      const capacities = Object.entries(d.capacityByTeam || {}).map(([team_id, capacity]) => ({ team_id, capacity }));
      await this.sprintsSvc.setSprintTeamCapacities(sprint.id, capacities);
      this.cancelEdit();
      await this.reload();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to save sprint.');
    } finally {
      this.saving.set(false);
    }
  }

  async setStatus(s: Sprint, status: SprintStatus): Promise<void> {
    await this.sprintsSvc.setStatus(s.id, status);
    await this.reload();
  }
}
