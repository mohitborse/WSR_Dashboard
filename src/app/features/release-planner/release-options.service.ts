import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/supabase.service';
import { ReleaseOptions } from './release.model';

interface ReleaseOptionRow {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ReleaseOptionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(): Promise<ReleaseOptions> {
    const [environments, pods, statuses] = await Promise.all([
      this.listActiveCatalog('release_environments'),
      this.listActivePods(),
      this.listActiveCatalog('release_statuses'),
    ]);
    return { environments, pods, statuses };
  }

  private async listActiveCatalog(table: 'release_environments' | 'release_statuses'): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from(table)
      .select('name')
      .eq('active', true)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return ((data ?? []) as ReleaseOptionRow[]).map((option) => option.name);
  }

  private async listActivePods(): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('sub_teams')
      .select('name')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return [...new Set(((data ?? []) as ReleaseOptionRow[]).map((option) => option.name))];
  }
}