import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Developer } from '../models';

export interface DeveloperFilters {
  teamId?: string;
  subTeamId?: string;
  activeOnly?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DevelopersService {
  constructor(private supabase: SupabaseService) {}

  async getDevelopers(filters: DeveloperFilters = {}): Promise<Developer[]> {
    let query = this.supabase.client.from('developers').select('*').order('name');
    if (filters.teamId) query = query.eq('team_id', filters.teamId);
    if (filters.subTeamId) query = query.eq('sub_team_id', filters.subTeamId);
    if (filters.activeOnly) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Developer[];
  }

  async getDeveloper(id: string): Promise<Developer | null> {
    const { data, error } = await this.supabase.client.from('developers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Developer | null;
  }

  async createDeveloper(payload: Omit<Developer, 'id' | 'created_at'>): Promise<Developer> {
    const { data, error } = await this.supabase.client.from('developers').insert(payload).select('*').single();
    if (error) throw error;
    return data as Developer;
  }

  async updateDeveloper(id: string, patch: Partial<Omit<Developer, 'id' | 'created_at'>>): Promise<Developer> {
    const { data, error } = await this.supabase.client
      .from('developers')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Developer;
  }

  async deactivateDeveloper(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('developers').update({ active: false }).eq('id', id);
    if (error) throw error;
  }
}
