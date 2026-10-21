import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-developer-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './developer-summary.component.html',
})
export class DeveloperSummaryComponent {
  @Input() dev: any;
}
