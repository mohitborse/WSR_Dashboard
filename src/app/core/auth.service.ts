import { Injectable, signal, computed } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<Session | null>(null);
  private readonly _profile = signal<Profile | null>(null);
  private readonly _loading = signal<boolean>(true);
  private readonly _initialized = signal<boolean>(false);

  readonly session = this._session.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  readonly isLoggedIn = computed(() => !!this._session());
  readonly role = computed<UserRole | null>(() => this._profile()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly isManager = computed(() => this.role() === 'MANAGER');
  readonly isViewer = computed(() => this.role() === 'VIEWER');
  /** Admins and managers can enter/edit WSR data; viewers cannot. */
  readonly canEdit = computed(() => this.role() === 'ADMIN' || this.role() === 'MANAGER');

  private initPromise: Promise<void> | null = null;

  constructor(private supabase: SupabaseService) {
    this.initPromise = this.init();
  }

  /** Called once at app start (see APP_INITIALIZER in app.config.ts). */
  async init(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this._session.set(data.session ?? null);
    console.log('session', data.session);
    if (data.session) {
      await this.loadProfile(data.session.user.id);
    }
    this._loading.set(false);
    this._initialized.set(true);

    this.supabase.client.auth.onAuthStateChange(async (_event, session) => {
      this._session.set(session);
      if (session) {
        await this.loadProfile(session.user.id);
      } else {
        this._profile.set(null);
      }
    });
  }

  async whenReady(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    console.log('loadprofile', data);
    if (error) {
      console.error('Failed to load profile', error);
      this._profile.set(null);
      return;
    }
    this._profile.set(data as Profile | null);
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._session.set(null);
    this._profile.set(null);
  }

  async forgotPassword(email: string): Promise<{ error: string | null }> {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { error: error.message };
    return { error: null };
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  }
}
