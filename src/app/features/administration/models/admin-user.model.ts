export type TipoDocumento = 'DNI' | 'CE' | 'PAS' | 'RUC' | 'OTR';

export interface AdminUser {
  id: number;
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
  role: 'medico' | 'paciente' | 'investigador' | 'administrador' | null;
  avatar_url: string | null;
  date_joined: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  fecha_nacimiento: string | null;
  sexo: 'M' | 'F' | 'O' | '';
  numero_colegiatura: string;
  orcid: string;
  institucion: string;
}

export interface AdminRole {
  id: number;
  name: string;
  user_count: number;
  permissions: RolePermission[];
}

export interface RolePermission {
  id: number;
  codename: string;
  name: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: RolePermission[];
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: 'medico' | 'paciente' | 'investigador' | 'administrador';
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  fecha_nacimiento?: string | null;
  sexo?: string;
  numero_colegiatura?: string;
  orcid?: string;
  institucion?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  role?: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  fecha_nacimiento?: string | null;
  sexo?: string;
  numero_colegiatura?: string;
  orcid?: string;
  institucion?: string;
}
