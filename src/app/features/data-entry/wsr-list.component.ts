import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WsrService } from '../../core/services/wsr.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-wsr-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wsr-list.component.html',
})
export class WsrListComponent implements OnInit {
  private wsrSvc = inject(WsrService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  rows = signal<any[]>([]);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const userId = this.auth.profile()?.id;
    if (!userId) {
      this.rows.set([]);
      this.loading.set(false);
      return;
    }
    const rows = await this.wsrSvc.getWsrReports({ developerId: userId });
    this.rows.set(rows);
    this.loading.set(false);
  }

  edit(row: any) {
    // Navigate to data-entry and prefill the form using query params
    this.router.navigate(['/data-entry'], {
      queryParams: { developer_id: row.developer_id, sprint_id: row.sprint_id, week_number: row.week_number ?? 1 },
    });
  }
}
