import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/supabase.service';
import { Release, ReleaseInput } from './release.model';

@Injectable({ providedIn: 'root' })
export class ReleaseService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(): Promise<Release[]> {
    const { data, error } = await this.supabase.client
      .from('releases')
      .select('*')
      .order('scheduled_date')
      .order('scheduled_time');
    if (error) throw error;
    return (data ?? []) as Release[];
  }

  async create(input: ReleaseInput): Promise<Release> {
    const { data, error } = await this.supabase.client.from('releases').insert(input).select().single();
    if (error) throw error;
    return data as Release;
  }

  async update(id: string, input: ReleaseInput): Promise<Release> {
    const { data, error } = await this.supabase.client
      .from('releases')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Release;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('releases').delete().eq('id', id);
    if (error) throw error;
  }
}