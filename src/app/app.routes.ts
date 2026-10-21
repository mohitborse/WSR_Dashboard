import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-layout.component').then((m) => m.AppLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'data-entry',
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () =>
          import('./features/data-entry/data-entry.component').then((m) => m.DataEntryComponent),
      },
      {
        path: 'wsr/list',
        loadComponent: () => import('./features/data-entry/wsr-list.component').then((m) => m.WsrListComponent),
      },
      {
        path: 'admin/teams',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/admin/teams/teams-admin.component').then((m) => m.TeamsAdminComponent),
      },
      {
        path: 'admin/developers',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/admin/developers/developers-admin.component').then(
            (m) => m.DevelopersAdminComponent
          ),
      },
      {
        path: 'admin/sprints',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/admin/sprints/sprints-admin.component').then((m) => m.SprintsAdminComponent),
      },
      {
        path: 'admin/sprint-summary',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/admin/sprint-summary.component').then((m) => m.SprintSummaryComponent),
      },
      {
        path: 'admin/developer-summaries',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/admin/developer-summaries.component').then((m) => m.DeveloperSummariesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
