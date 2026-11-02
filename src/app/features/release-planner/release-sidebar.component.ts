import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Clock3, LucideAngularModule, Pencil, Plus, Trash2 } from 'lucide-angular';
import { Release } from './release.model';

export interface ReleaseSummary { total: number; ppd: number; prod: number; }

@Component({ selector: 'app-release-sidebar', standalone: true, imports: [DatePipe, LucideAngularModule], templateUrl: './release-sidebar.component.html', styleUrl: './release-sidebar.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ReleaseSidebarComponent {
  readonly Clock3 = Clock3;
  readonly Pencil = Pencil;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  @Input({ required: true }) selectedDate = '';
  @Input({ required: true }) releases: Release[] = [];
  @Input({ required: true }) summary: ReleaseSummary = { total: 0, ppd: 0, prod: 0 };
  @Output() readonly editRelease = new EventEmitter<Release>();
  @Output() readonly deleteRelease = new EventEmitter<Release>();
  @Output() readonly addRelease = new EventEmitter<void>();
  get selectedDateValue(): Date { return new Date(`${this.selectedDate}T00:00:00`); }
  displayTime(time: string): string {
    const [hours = '0', minutes = '0'] = time.split(':');
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, Number(hours), Number(minutes)));
  }
}