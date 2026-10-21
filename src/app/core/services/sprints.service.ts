import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Sprint, SprintStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class SprintsService {
  constructor(private supabase: SupabaseService) {}

  async getSprints(): Promise<Sprint[]> {
    const { data, error } = await this.supabase.client
      .from('sprints')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Sprint[];
  }

  async getActiveSprint(): Promise<Sprint | null> {
    const { data, error } = await this.supabase.client
      .from('sprints')
      .select('*')
      .eq('status', 'Active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as Sprint | null;
  }

  async createSprint(payload: {
    name: string;
    start_date: string;
    end_date: string;
    capacity: number;
    status?: SprintStatus;
  }): Promise<Sprint> {
    const { data, error } = await this.supabase.client
      .from('sprints')
      .insert({ ...payload, status: payload.status ?? 'Planned' })
      .select('*')
      .single();
    if (error) throw error;
    return data as Sprint;
  }

  // Team-level capacities ----------------------------------------------------
  async getSprintTeamCapacities(sprintId: string): Promise<{ team_id: string; capacity: number }[]> {
    const { data, error } = await this.supabase.client
      .from('sprint_team_capacities')
      .select('*')
      .eq('sprint_id', sprintId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ team_id: r.team_id, capacity: Number(r.capacity) }));
  }

  async setSprintTeamCapacities(sprintId: string, capacities: { team_id: string; capacity: number }[]): Promise<void> {
    if (!capacities || capacities.length === 0) return;
    // upsert rows, primary key (sprint_id, team_id)
    const payload = capacities.map((c) => ({ sprint_id: sprintId, team_id: c.team_id, capacity: c.capacity }));
    const { error } = await this.supabase.client.from('sprint_team_capacities').upsert(payload, { onConflict: 'sprint_id,team_id' });
    if (error) throw error;
  }

  async updateSprint(id: string, patch: Partial<Omit<Sprint, 'id' | 'created_at'>>): Promise<Sprint> {
    const { data, error } = await this.supabase.client
      .from('sprints')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Sprint;
  }

  async setStatus(id: string, status: SprintStatus): Promise<void> {
    const { error } = await this.supabase.client.from('sprints').update({ status }).eq('id', id);
    if (error) throw error;
  }
}
