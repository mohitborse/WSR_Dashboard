import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {
  sidebarOpen = signal(true);

  mainNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Data Entry', path: '/data-entry' },
  ];

  adminNav: NavItem[] = [
    { label: 'Teams', path: '/admin/teams' },
    { label: 'Developers', path: '/admin/developers' },
    { label: 'Sprints', path: '/admin/sprints' },
    { label: 'Sprint Summary', path: '/admin/sprint-summary' },
    { label: 'Developer Summaries', path: '/admin/developer-summaries' },
  ];

  managerNav: NavItem[] = [
    { label: 'Sprint Summary', path: '/admin/sprint-summary' },
    { label: 'Developer Summaries', path: '/admin/developer-summaries' },
  ];

  constructor(public auth: AuthService, private router: Router) { }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
