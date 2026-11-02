import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BarChart3, CalendarDays, ChevronDown, LucideAngularModule, Plus } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { ReleaseCalendarComponent } from './release-calendar.component';
import { ReleaseFormModalComponent } from './release-form-modal.component';
import { ReleaseSidebarComponent } from './release-sidebar.component';
import { ReleaseSummaryModalComponent } from './release-summary-modal.component';
import { Release, ReleaseInput } from './release.model';
import { EnvironmentFilter, PodFilter, ReleaseStore, StatusFilter } from './release.store';

@Component({
  selector: 'app-release-planner',
  standalone: true,
  imports: [
    LucideAngularModule,
    ReleaseCalendarComponent,
    ReleaseSidebarComponent,
    ReleaseFormModalComponent,
    ReleaseSummaryModalComponent,
  ],
  templateUrl: './release-planner.component.html',
  styleUrl: './release-planner.component.scss',
  providers: [ReleaseStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleasePlannerComponent implements OnInit {
  readonly BarChart3 = BarChart3;
  readonly CalendarDays = CalendarDays;
  readonly ChevronDown = ChevronDown;
  readonly Plus = Plus;
  constructor(readonly store: ReleaseStore, readonly auth: AuthService) {}

  ngOnInit(): void {
    void this.store.load();
  }

  setEnvironment(value: EnvironmentFilter): void {
    this.store.environmentFilter.set(value);
  }

  setStatus(value: StatusFilter): void {
    this.store.statusFilter.set(value);
  }

  setPod(event: Event): void {
    this.store.podFilter.set((event.target as HTMLSelectElement).value as PodFilter);
  }

  async save(input: ReleaseInput): Promise<void> {
    await this.store.save(input);
  }

  async remove(release: Release): Promise<void> {
    const confirmed = window.confirm(`Delete "${release.title}"? This action cannot be undone.`);
    if (confirmed) await this.store.remove(release);
  }
}