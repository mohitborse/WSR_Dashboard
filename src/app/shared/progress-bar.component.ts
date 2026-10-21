import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusLevel } from '../core/models';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          class="h-full rounded-full transition-all"
          [class.bg-success-500]="level === 'good'"
          [class.bg-warning-500]="level === 'warning'"
          [class.bg-danger-500]="level === 'risk'"
          [style.width.%]="clamped"
        ></div>
      </div>
    </div>
  `,
})
export class ProgressBarComponent {
  @Input() value = 0; // 0-100
  @Input() level: StatusLevel = 'good';

  get clamped(): number {
    return Math.max(0, Math.min(100, this.value || 0));
  }
}
