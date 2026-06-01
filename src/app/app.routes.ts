import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { roleGuard } from '@core/guards/role.guard';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'demo',
        loadComponent: () => import('./features/demo-ecg/demo-ecg.component')
          .then(m => m.DemoEcgComponent)
      },
      {
        path: 'ecg-analysis',
        canActivate: [roleGuard(['medico', 'investigador'])],
        children: [
          {
            path: 'annotated',
            loadComponent: () => import('./features/ecg-analysis/ecg-analysis.component')
              .then(m => m.EcgAnalysisComponent),
            data: { mode: 'evaluation' }
          },
          {
            path: 'production',
            loadComponent: () => import('./features/ecg-analysis/ecg-analysis.component')
              .then(m => m.EcgAnalysisComponent),
            data: { mode: 'production' }
          },
          { path: '', redirectTo: 'annotated', pathMatch: 'full' }
        ]
      },
      {
        path: 'history',
        canActivate: [roleGuard(['medico', 'paciente', 'investigador', 'administrador'])],
        loadComponent: () => import('./features/ecg-history/ecg-history.component')
          .then(m => m.EcgHistoryComponent)
      },
      {
        path: 'patients',
        canActivate: [roleGuard(['medico', 'investigador', 'administrador'])],
        loadComponent: () => import('./features/patients/patients.component')
          .then(m => m.PatientsComponent)
      },
      {
        path: 'patients/:id',
        canActivate: [roleGuard(['medico', 'investigador', 'administrador'])],
        loadComponent: () => import('./features/patients/patient-detail.component')
          .then(m => m.PatientDetailComponent)
      },
      {
        path: 'model-info',
        canActivate: [authGuard],
        loadComponent: () => import('./features/model-info/model-info.component')
          .then(m => m.ModelInfoComponent)
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['administrador'])],
        loadComponent: () => import('./features/administration/administration.component')
          .then(m => m.AdministrationComponent),
        children: [
          {
            path: 'users',
            loadComponent: () => import('./features/administration/components/users/users.component')
              .then(m => m.UsersComponent)
          },
          {
            path: 'roles',
            loadComponent: () => import('./features/administration/components/roles/roles.component')
              .then(m => m.RolesComponent)
          },
          { path: '', redirectTo: 'users', pathMatch: 'full' }
        ]
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'auth/google/callback',
        loadComponent: () => import('./features/auth/google-callback/google-callback.component')
          .then(m => m.GoogleCallbackComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
