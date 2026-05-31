import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminRole, RolePermission } from '../../models/admin-user.model';
import { RoleEditModalComponent } from './role-edit-modal/role-edit-modal.component';
import { AppPaginationComponent } from '@shared/components/app-pagination/app-pagination.component';
import { ROLE_CHIP, ROLE_LABELS, ROLE_ICONS } from '@core/constants/roles.constants';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, RoleEditModalComponent, AppPaginationComponent],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css'],
})
export class RolesComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  isLoading   = signal(true);
  errorMsg    = signal<string | null>(null);
  roles       = signal<AdminRole[]>([]);
  editingRole = signal<AdminRole | null>(null);

  readonly totalCount = computed(() => this.roles().length);

  ngOnInit(): void { this.loadRoles(); }

  loadRoles(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.api.getRoles().subscribe({
      next: res => { this.roles.set(res.data); this.isLoading.set(false); },
      error: ()  => { this.errorMsg.set('No se pudo cargar los roles.'); this.isLoading.set(false); },
    });
  }

  onSaved(): void { this.editingRole.set(null); this.loadRoles(); }

  roleChipClass(name: string): string { return ROLE_CHIP[name] ?? 'chip chip-gray'; }
  roleLabel(name: string):     string { return ROLE_LABELS[name] ?? name; }
  roleIcon(name: string):      string { return ROLE_ICONS[name]  ?? 'fas fa-shield-alt'; }

  permPreview(perms: RolePermission[]): string {
    const sample = perms.slice(0, 3).map(p => p.name).join(' · ');
    return perms.length > 3 ? sample + ' ...' : sample;
  }

  trackById(_: number, item: { id: number }): number { return item.id; }
}
