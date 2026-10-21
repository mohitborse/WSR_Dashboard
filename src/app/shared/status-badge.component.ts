import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusLevel } from '../core/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      [class.bg-success-50]="level === 'good'"
      [class.text-success-700]="level === 'good'"
      [class.bg-warning-50]="level === 'warning'"
      [class.text-warning-700]="level === 'warning'"
      [class.bg-danger-50]="level === 'risk'"
      [class.text-danger-700]="level === 'risk'"
    >
      <span class="h-1.5 w-1.5 rounded-full"
        [class.bg-success-500]="level === 'good'"
        [class.bg-warning-500]="level === 'warning'"
        [class.bg-danger-500]="level === 'risk'"
      ></span>
      {{ label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() level: StatusLevel = 'good';

  get label(): string {
    return this.level === 'good' ? 'Good' : this.level === 'warning' ? 'Needs Attention' : 'At Risk';
  }
}
