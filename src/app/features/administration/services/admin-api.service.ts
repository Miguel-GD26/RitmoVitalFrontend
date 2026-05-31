import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';
import { AdminUser, AdminRole, PermissionGroup, CreateUserRequest, UpdateUserRequest } from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/admin`;

  getUsers(page = 1, pageSize = 20, search = '', role = ''): Observable<ApiResponse<AdminUser[]>> {
    const params: Record<string, string> = { page: String(page), page_size: String(pageSize) };
    if (search) params['search'] = search;
    if (role)   params['role']   = role;
    return this.http.get<ApiResponse<AdminUser[]>>(`${this.base}/users/`, { params });
  }

  createUser(data: CreateUserRequest): Observable<ApiResponse<AdminUser>> {
    return this.http.post<ApiResponse<AdminUser>>(`${this.base}/users/`, data);
  }

  updateUser(uuid: string, data: UpdateUserRequest): Observable<ApiResponse<AdminUser>> {
    return this.http.put<ApiResponse<AdminUser>>(`${this.base}/users/${uuid}/`, data);
  }

  deactivateUser(uuid: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/users/${uuid}/`);
  }

  uploadAvatar(uuid: string, file: File): Observable<ApiResponse<{ avatar_url: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.put<ApiResponse<{ avatar_url: string }>>(`${this.base}/users/${uuid}/avatar/`, formData);
  }

  getRoles(): Observable<ApiResponse<AdminRole[]>> {
    return this.http.get<ApiResponse<AdminRole[]>>(`${this.base}/roles/`);
  }

  updateRole(id: number, permissionIds: number[]): Observable<ApiResponse<AdminRole>> {
    return this.http.put<ApiResponse<AdminRole>>(`${this.base}/roles/${id}/`, { permission_ids: permissionIds });
  }

  getPermissions(): Observable<ApiResponse<PermissionGroup[]>> {
    return this.http.get<ApiResponse<PermissionGroup[]>>(`${this.base}/permissions/`);
  }
}
