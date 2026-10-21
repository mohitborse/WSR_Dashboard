import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { SubTeam, Team } from '../models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  constructor(private supabase: SupabaseService) {}

  async getTeams(activeOnly = false): Promise<Team[]> {
    let query = this.supabase.client.from('teams').select('*').order('name');
    console.log(query);
    if (activeOnly) query = query.eq('active', true);
    const { data, error } = await query;
    console.log(data);
    if (error) throw error;
    return (data ?? []) as Team[];
  }

  async createTeam(name: string, description: string | null): Promise<Team> {
    const { data, error } = await this.supabase.client
      .from('teams')
      .insert({ name, description, active: true })
      .select('*')
      .single();
    if (error) throw error;
    return data as Team;
  }

  async updateTeam(id: string, patch: Partial<Pick<Team, 'name' | 'description' | 'active'>>): Promise<Team> {
    const { data, error } = await this.supabase.client
      .from('teams')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Team;
  }

  async deactivateTeam(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('teams').update({ active: false }).eq('id', id);
    if (error) throw error;
  }

  async getSubTeams(teamId?: string, activeOnly = false): Promise<SubTeam[]> {
    let query = this.supabase.client.from('sub_teams').select('*').order('name');
    if (teamId) query = query.eq('team_id', teamId);
    if (activeOnly) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SubTeam[];
  }

  async createSubTeam(teamId: string, name: string): Promise<SubTeam> {
    const { data, error } = await this.supabase.client
      .from('sub_teams')
      .insert({ team_id: teamId, name, active: true })
      .select('*')
      .single();
    if (error) throw error;
    return data as SubTeam;
  }

  async updateSubTeam(id: string, patch: Partial<Pick<SubTeam, 'name' | 'team_id' | 'active'>>): Promise<SubTeam> {
    const { data, error } = await this.supabase.client
      .from('sub_teams')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as SubTeam;
  }

  async deactivateSubTeam(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('sub_teams').update({ active: false }).eq('id', id);
    if (error) throw error;
  }
}
