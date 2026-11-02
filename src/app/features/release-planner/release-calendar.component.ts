import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CalendarDays, ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { Release } from './release.model';

interface CalendarDay { date: Date; key: string; number: number; inMonth: boolean; today: boolean; }

@Component({
  selector: 'app-release-calendar',
  standalone: true,
  imports: [DatePipe, LucideAngularModule],
  templateUrl: './release-calendar.component.html',
  styleUrl: './release-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleaseCalendarComponent {
  readonly CalendarDays = CalendarDays;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  @Input({ required: true }) currentMonth!: Date;
  @Input({ required: true }) selectedDate = '';
  @Input({ required: true }) releases: Release[] = [];
  @Output() readonly dateSelected = new EventEmitter<string>();
  @Output() readonly releaseSelected = new EventEmitter<Release>();
  @Output() readonly previousMonth = new EventEmitter<void>();
  @Output() readonly nextMonth = new EventEmitter<void>();
  @Output() readonly todaySelected = new EventEmitter<void>();
  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  get days(): CalendarDay[] {
    const first = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const today = this.dateKey(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const key = this.dateKey(date);
      return { date, key, number: date.getDate(), inMonth: date.getMonth() === first.getMonth(), today: key === today };
    });
  }

  releasesFor(date: string): Release[] {
    return this.releases.filter((release) => release.scheduled_date === date);
  }

  chooseRelease(event: MouseEvent, release: Release): void {
    event.stopPropagation();
    this.releaseSelected.emit(release);
  }

  private dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}