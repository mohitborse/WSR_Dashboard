import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, ViewEncapsulation } from '@angular/core';
import { CalendarDays, Check, Copy, LucideAngularModule, X } from 'lucide-angular';
import { Release } from './release.model';

export interface AdminReleaseSummary {
  total: number;
  environments: { ppd: number; prod: number };
  statuses: { planned: number; inProgress: number; completed: number };
  pods: { panda: number; avenger: number; apollo: number };
  upcoming: Release[];
}

@Component({
  selector: 'app-release-summary-modal',
  standalone: true,
  imports: [DatePipe, LucideAngularModule],
  templateUrl: './release-summary-modal.component.html',
  styleUrl: './release-summary-modal.component.scss',
  host: { class: 'release-summary-host' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleaseSummaryModalComponent {
  @Input({ required: true }) summary!: AdminReleaseSummary;
  @Output() readonly dismissed = new EventEmitter<void>();
  readonly CalendarDays = CalendarDays;
  readonly Check = Check;
  readonly Copy = Copy;
  readonly X = X;
  readonly copied = signal(false);

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismissed.emit();
  }

  releaseDate(release: Release): Date {
    return new Date(`${release.scheduled_date}T${release.scheduled_time}`);
  }

  async copySummary(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.summaryText());
      this.copied.set(true);
      window.setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }

  summaryText(): string {
    const separator = '----------------------------------------';
    const upcoming = this.summary.upcoming.length
      ? this.summary.upcoming.map((release) => {
          const date = new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(this.releaseDate(release));
          return `${date} | ${release.title} | ${release.environment} | ${release.pod} | ${release.status}`;
        })
      : ['No upcoming deployments'];

    return [
      'RELEASE SUMMARY',
      separator,
      `All Releases: ${this.summary.total}`,
      '',
      'ENVIRONMENT',
      separator,
      `PPD: ${this.summary.environments.ppd}`,
      `Production: ${this.summary.environments.prod}`,
      '',
      'STATUS',
      separator,
      `Planned: ${this.summary.statuses.planned}`,
      `In Progress: ${this.summary.statuses.inProgress}`,
      `Completed: ${this.summary.statuses.completed}`,
      '',
      'POD',
      separator,
      `Panda: ${this.summary.pods.panda}`,
      `Avenger: ${this.summary.pods.avenger}`,
      `Apollo: ${this.summary.pods.apollo}`,
      '',
      'UPCOMING DEPLOYMENTS',
      separator,
      ...upcoming,
    ].join('\n');
  }
}