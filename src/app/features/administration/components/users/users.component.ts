import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminUser } from '../../models/admin-user.model';
import { AlertService } from '@core/services/alert';
import { AppPaginationComponent } from '@shared/components/app-pagination/app-pagination.component';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { UserCreateModalComponent } from './user-create-modal/user-create-modal.component';
import { UserEditModalComponent } from './user-edit-modal/user-edit-modal.component';
import { ROLE_LABELS, ROLE_CHIP } from '@core/constants/roles.constants';
import { getDropdownPos } from '@shared/utils/dropdown.utils';
import { useListSearch } from '@shared/utils/list-search.utils';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, AppPaginationComponent, FormatDatePipe, UserCreateModalComponent, UserEditModalComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  private readonly api   = inject(AdminApiService);
  private readonly alert = inject(AlertService);

  private readonly _list = useListSearch<AdminUser>(page => this.loadUsers(page));

  readonly users       = this._list.items;
  readonly isLoading   = this._list.isLoading;
  readonly pagination  = this._list.pagination;
  readonly currentPage = this._list.currentPage;
  readonly searchTerm  = this._list.searchTerm;
  readonly errorMsg    = this._list.errorMessage;
  readonly totalCount  = this._list.totalCount;
  readonly onSearchInput = this._list.onSearchInput;
  readonly clearSearch   = this._list.clearSearch;

  readonly roleLabels  = ROLE_LABELS;
  readonly roleOptions = ['medico', 'paciente', 'investigador'] as const;

  roleFilter  = signal('');
  showCreate  = signal(false);
  editingUser = signal<AdminUser | null>(null);
  showFilters = signal(false);
  filtersPos  = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  readonly activeFilterCount = computed(() => this.roleFilter() ? 1 : 0);

  ngOnInit(): void { this.loadUsers(1); }

  loadUsers(page: number): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.currentPage.set(page);
    this.api.getUsers(page, 20, this.searchTerm(), this.roleFilter()).subscribe({
      next: res => {
        this.users.set(res.data);
        this.pagination.set(res.pagination ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar la lista de usuarios.');
        this.isLoading.set(false);
      },
    });
  }

  setRoleFilter(role: string): void {
    this.roleFilter.set(role);
    this.showFilters.set(false);
    this.loadUsers(1);
  }
  clearFilters(): void { this.roleFilter.set(''); this.showFilters.set(false); this.loadUsers(1); }

  toggleFilters(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.showFilters()) {
      this.filtersPos.set(getDropdownPos(event, 220));
      this.showFilters.set(true);
    } else {
      this.showFilters.set(false);
    }
  }

  @HostListener('document:click')
  onDocClick(): void { this.showFilters.set(false); }

  onCreated(): void { this.showCreate.set(false); this.loadUsers(1); }
  onSaved(): void { this.editingUser.set(null); this.loadUsers(this.currentPage()); }

  async deactivate(user: AdminUser): Promise<void> {
    const result = await this.alert.delete(
      `Se desactivará la cuenta de ${user.email}.`,
      '¿Desactivar usuario?'
    );
    if (!result.isConfirmed) return;
    this.api.deactivateUser(user.uuid).subscribe({
      next: () => {
        this.alert.toast('Usuario desactivado.', 'success');
        this.loadUsers(this.currentPage());
      },
      error: err => this.alert.error(err.error?.message ?? 'No se pudo desactivar el usuario.'),
    });
  }

  roleChipClass(role: string | null): string {
    return ROLE_CHIP[role ?? ''] ?? 'chip chip-gray';
  }

  roleLabel(role: string | null): string {
    return role ? (ROLE_LABELS[role] ?? role) : 'Sin rol';
  }

  userInitials(user: AdminUser): string {
    const fn = user.first_name?.trim() ?? '';
    const ln = user.last_name?.trim() ?? '';
    if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase();
    return (user.username?.[0] ?? '?').toUpperCase();
  }

  trackById(_: number, item: { id: number }): number { return item.id; }
}
