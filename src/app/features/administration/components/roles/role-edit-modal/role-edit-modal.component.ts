import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../../services/admin-api.service';
import { AdminRole, PermissionGroup } from '../../../models/admin-user.model';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AppSearchInputComponent } from '@shared/components/app-search-input/app-search-input.component';
import { AlertService } from '@core/services/alert';
import { ROLE_CHIP, ROLE_LABELS } from '@core/constants/roles.constants';

@Component({
  selector: 'app-role-edit-modal',
  standalone: true,
  imports: [CommonModule, AppModalComponent, AppSearchInputComponent],
  templateUrl: './role-edit-modal.component.html',
  styleUrls: ['./role-edit-modal.component.css'],
})
export class RoleEditModalComponent implements OnInit {
  private readonly api   = inject(AdminApiService);
  private readonly alert = inject(AlertService);

  readonly role   = input.required<AdminRole>();
  readonly saved  = output<void>();
  readonly closed = output<void>();

  isLoadingPerms = signal(true);
  isSaving       = signal(false);
  permGroups     = signal<PermissionGroup[]>([]);
  searchTerm     = signal('');
  selectedIds    = signal<Set<number>>(new Set());

  readonly roleChipClass = computed(() => ROLE_CHIP[this.role().name] ?? 'chip chip-gray');
  readonly roleLabel     = computed(() => ROLE_LABELS[this.role().name] ?? this.role().name);

  readonly totalCount = computed(() =>
    this.permGroups().reduce((s, g) => s + g.permissions.length, 0)
  );

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly filteredGroups = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.permGroups();
    return this.permGroups()
      .map(g => ({
        ...g,
        permissions: g.permissions.filter(
          p => p.name.toLowerCase().includes(term) || p.codename.toLowerCase().includes(term)
        ),
      }))
      .filter(g => g.permissions.length > 0);
  });

  ngOnInit(): void {
    const currentIds = new Set(this.role().permissions.map(p => p.id));
    this.selectedIds.set(currentIds);

    this.api.getPermissions().subscribe({
      next: res => { this.permGroups.set(res.data); this.isLoadingPerms.set(false); },
      error: ()  => { this.isLoadingPerms.set(false); },
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggle(id: number): void {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
  }

  selectAll(): void {
    const all = new Set<number>();
    this.filteredGroups().forEach(g => g.permissions.forEach(p => all.add(p.id)));
    const merged = new Set([...this.selectedIds(), ...all]);
    this.selectedIds.set(merged);
  }

  clearAll(): void {
    if (!this.searchTerm()) {
      this.selectedIds.set(new Set());
      return;
    }
    const visibleIds = new Set<number>();
    this.filteredGroups().forEach(g => g.permissions.forEach(p => visibleIds.add(p.id)));
    const next = new Set([...this.selectedIds()].filter(id => !visibleIds.has(id)));
    this.selectedIds.set(next);
  }

  submit(): void {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    const ids = [...this.selectedIds()];
    this.api.updateRole(this.role().id, ids).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.alert.success(`Permisos del rol "${this.roleLabel()}" actualizados.`);
        this.saved.emit();
      },
      error: err => {
        this.isSaving.set(false);
        this.alert.error(err.error?.message ?? 'Error al actualizar los permisos.');
      },
    });
  }
}
