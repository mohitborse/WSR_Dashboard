import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarComponent } from './progress-bar.component';
import { StatusBadgeComponent } from './status-badge.component';
import { WsrReportView, availableCapacity, deliveryStatus, storyDeliveryPct, utilizationPct, utilizationStatus } from '../core/models';

@Component({
  selector: 'app-developer-card',
  standalone: true,
  imports: [CommonModule, ProgressBarComponent, StatusBadgeComponent],
  templateUrl: './developer-card.component.html',
})
export class DeveloperCardComponent {
  @Input({ required: true }) report!: WsrReportView;

  // Plain getters (re-evaluated every change-detection pass) rather than
  // computed() signals, since `report` is a regular @Input, not a signal.
  get util(): number {
    return utilizationPct(this.report.reported_hours, this.report.sprint_capacity, this.report.leave_hours);
  }
  get utilLevel() {
    return utilizationStatus(this.util);
  }
  get storyPct(): number {
    return storyDeliveryPct(this.report.stories_delivered, this.report.stories_planned);
  }
  get storyLevel() {
    return deliveryStatus(this.storyPct);
  }
  get avail(): number {
    return availableCapacity(this.report.sprint_capacity, this.report.leave_hours);
  }
}
