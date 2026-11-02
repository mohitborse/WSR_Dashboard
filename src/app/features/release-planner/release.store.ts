import { computed, Injectable, signal } from '@angular/core';
import { Release, ReleaseEnvironment, ReleaseInput, ReleaseOptions, ReleasePod, ReleaseStatus } from './release.model';
import { ReleaseOptionsService } from './release-options.service';
import { ReleaseService } from './release.service';

export type EnvironmentFilter = ReleaseEnvironment | 'All';
export type PodFilter = ReleasePod | 'All';
export type StatusFilter = ReleaseStatus | 'All';

@Injectable()
export class ReleaseStore {
  readonly releases = signal<Release[]>([]);
  readonly options = signal<ReleaseOptions>({ environments: [], pods: [], statuses: [] });
  readonly selectedDate = signal(this.toDateKey(new Date()));
  readonly currentMonth = signal(this.startOfMonth(new Date()));
  readonly environmentFilter = signal<EnvironmentFilter>('All');
  readonly statusFilter = signal<StatusFilter>('All');
  readonly podFilter = signal<PodFilter>('All');
  readonly modalOpen = signal(false);
  readonly summaryOpen = signal(false);
  readonly editingRelease = signal<Release | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly filteredReleases = computed(() =>
    this.releases().filter((release) =>
      (this.environmentFilter() === 'All' || release.environment === this.environmentFilter()) &&
      (this.statusFilter() === 'All' || release.status === this.statusFilter()) &&
      (this.podFilter() === 'All' || release.pod === this.podFilter())
    )
  );

  readonly selectedDateReleases = computed(() =>
    this.filteredReleases().filter((release) => release.scheduled_date === this.selectedDate())
  );

  readonly summary = computed(() => {
    const releases = this.filteredReleases();
    return {
      total: releases.length,
      ppd: releases.filter((release) => release.environment === 'PPD').length,
      prod: releases.filter((release) => release.environment === 'Prod').length,
    };
  });

  readonly adminSummary = computed(() => {
    const releases = this.releases();
    const today = this.toDateKey(new Date());
    const upcoming = releases
      .filter((release) => release.scheduled_date >= today && release.status !== 'Completed')
      .sort((left, right) =>
        `${left.scheduled_date}T${left.scheduled_time}`.localeCompare(`${right.scheduled_date}T${right.scheduled_time}`)
      );
    return {
      total: releases.length,
      environments: {
        ppd: releases.filter((release) => release.environment === 'PPD').length,
        prod: releases.filter((release) => release.environment === 'Prod').length,
      },
      statuses: {
        planned: releases.filter((release) => release.status === 'Planned').length,
        inProgress: releases.filter((release) => release.status === 'In Progress').length,
        completed: releases.filter((release) => release.status === 'Completed').length,
      },
      pods: {
        panda: releases.filter((release) => release.pod === 'Panda').length,
        avenger: releases.filter((release) => release.pod === 'Avenger').length,
        apollo: releases.filter((release) => release.pod === 'Apollo').length,
      },
      upcoming,
    };
  });

  constructor(
    private readonly releaseService: ReleaseService,
    private readonly releaseOptionsService: ReleaseOptionsService
  ) {}

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [releases, options] = await Promise.all([
        this.releaseService.list(),
        this.releaseOptionsService.list(),
      ]);
      this.releases.set(releases);
      this.options.set(options);
    } catch (error) {
      this.error.set(this.messageFrom(error, 'Unable to load releases.'));
    } finally {
      this.loading.set(false);
    }
  }

  async save(input: ReleaseInput): Promise<boolean> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const editing = this.editingRelease();
      const saved = editing
        ? await this.releaseService.update(editing.id, input)
        : await this.releaseService.create(input);
      this.releases.update((items) =>
        editing ? items.map((item) => (item.id === saved.id ? saved : item)) : [...items, saved]
      );
      this.closeModal();
      this.showNotice(editing ? 'Release updated.' : 'Release created.');
      return true;
    } catch (error) {
      this.error.set(this.messageFrom(error, 'Unable to save the release.'));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async remove(release: Release): Promise<boolean> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.releaseService.delete(release.id);
      this.releases.update((items) => items.filter((item) => item.id !== release.id));
      this.showNotice('Release deleted.');
      return true;
    } catch (error) {
      this.error.set(this.messageFrom(error, 'Unable to delete the release.'));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  openCreate(date = this.selectedDate()): void {
    this.selectedDate.set(date);
    this.editingRelease.set(null);
    this.modalOpen.set(true);
  }

  openEdit(release: Release): void {
    this.editingRelease.set(release);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingRelease.set(null);
  }

  moveMonth(offset: number): void {
    const month = this.currentMonth();
    this.currentMonth.set(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth.set(this.startOfMonth(today));
    this.selectedDate.set(this.toDateKey(today));
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    window.setTimeout(() => this.notice.set(null), 3000);
  }

  private messageFrom(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}