export type MenuItemType = 'link' | 'group' | 'separator';

export interface SubMenuItem {
  label: string;
  route: string;
  roles?: readonly string[];
  isActive?: boolean;
}

export interface MenuItem {
  type?: MenuItemType;
  label: string;
  icon?: string;
  route?: string;
  badge?: string;
  subMenu?: SubMenuItem[];
  roles?: readonly string[];
  isOpen?: boolean;
  isActive?: boolean;
}

export const NAV_ITEMS: MenuItem[] = [
  {
    label: 'Inicio',
    icon: 'fas fa-tachometer-alt',
    route: '/dashboard',
  },

  // Médico
  {
    label: 'Análisis ECG',
    icon: 'fas fa-stethoscope',
    type: 'group',
    roles: ['medico'],
    subMenu: [
      { label: 'Con Anotaciones', route: '/ecg-analysis/annotated', roles: ['medico'] },
      { label: 'Producción',      route: '/ecg-analysis/production', roles: ['medico'] },
    ],
  },
  {
    label: 'Pacientes',
    icon: 'fas fa-users',
    route: '/patients',
    roles: ['medico', 'administrador'],
  },
  {
    label: 'Historial',
    icon: 'fas fa-history',
    route: '/history',
    roles: ['medico', 'paciente', 'investigador', 'administrador'],
  },

  // Investigador
  {
    label: 'Demo ECG',
    icon: 'fas fa-flask',
    route: '/demo',
    roles: ['investigador'],
  },

  // Todos los roles
  {
    label: 'Acerca del Modelo',
    icon: 'fas fa-brain',
    route: '/model-info',
  },

  // Administrador
  {
    label: 'Administración',
    icon: 'fas fa-shield-alt',
    type: 'group',
    roles: ['administrador'],
    subMenu: [
      { label: 'Usuarios',         route: '/admin/users', roles: ['administrador'] },
      { label: 'Roles y Permisos', route: '/admin/roles', roles: ['administrador'] },
    ],
  },
];
