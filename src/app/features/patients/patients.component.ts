import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PatientsApiService } from './services/patients-api.service';
import { Patient } from '@core/models/patient.model';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AppFormSelectComponent, SelectOption } from '@shared/components/app-form-select/app-form-select.component';
import { AppSearchInputComponent } from '@shared/components/app-search-input/app-search-input.component';
import { AppPaginationComponent } from '@shared/components/app-pagination/app-pagination.component';
import { PatientHistoryModalComponent } from './components/patient-history-modal/patient-history-modal.component';
import { PatientVincularModalComponent } from './components/patient-vincular-modal/patient-vincular-modal.component';
import { AlertService } from '@core/services/alert';
import { AuthService } from '@core/services/auth/auth.service';
import { LookupService, DocumentoLookupResult } from '@core/services/lookup/lookup.service';
import { getDropdownPos } from '@shared/utils/dropdown.utils';
import { useListSearch } from '@shared/utils/list-search.utils';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    AppModalComponent, AppFormSelectComponent, AppSearchInputComponent,
    AppPaginationComponent, PatientHistoryModalComponent, PatientVincularModalComponent,
  ],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css'],
})
export class PatientsComponent implements OnInit {
  private readonly api    = inject(PatientsApiService);
  private readonly fb     = inject(FormBuilder);
  private readonly alert  = inject(AlertService);
  readonly auth           = inject(AuthService);
  private readonly lookup = inject(LookupService);

  private readonly _list = useListSearch<Patient>(page => this.loadPage(page));

  // === PATIENTS LIST ===
  readonly patients     = this._list.items;
  readonly isLoading    = this._list.isLoading;
  readonly pagination   = this._list.pagination;
  readonly currentPage  = this._list.currentPage;
  readonly searchTerm   = this._list.searchTerm;
  readonly errorMessage = this._list.errorMessage;
  readonly totalCount   = this._list.totalCount;
  readonly onSearchInput = this._list.onSearchInput;
  readonly clearSearch   = this._list.clearSearch;

  isSaving     = signal(false);
  showForm     = signal(false);
  editingUuid  = signal<string | null>(null);
  sexoFilter   = signal<string>('');
  showFilters  = signal(false);
  filtersPos   = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  openMenuId   = signal<string | null>(null);
  menuPos      = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  // === HISTORY MODAL ===
  showHistoryModal  = signal(false);
  historyPatient    = signal<Patient | null>(null);

  // === VINCULAR MODAL ===
  showVincularModal  = signal(false);
  vincularPatient    = signal<Patient | null>(null);

  // === DNI LOOKUP ===
  lookupLoading    = signal(false);
  lookupResult     = signal<DocumentoLookupResult | null>(null);
  showNombreFields = signal(false);

  // === FORM ===
  readonly tipoDocOptions: SelectOption[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE',  label: 'Carné de Extranjería' },
    { value: 'PAS', label: 'Pasaporte' },
    { value: 'OTR', label: 'Otro' },
  ];

  form: FormGroup = this.fb.group({
    nombre:           [''],
    apellido:         [''],
    tipo_documento:   ['DNI'],
    numero_documento: ['', Validators.maxLength(20)],
    historia_clinica: ['', Validators.maxLength(50)],
    notas:            [''],
  });

  // === LIFECYCLE ===
  ngOnInit(): void { this.loadPage(1); }

  // === PATIENTS CRUD ===
  loadPage(page: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentPage.set(page);
    this.api.getPatients(page, 20, this.searchTerm(), this.sexoFilter()).subscribe({
      next: res => {
        this.patients.set(res.data);
        this.pagination.set(res.pagination ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la lista de pacientes.');
        this.isLoading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingUuid.set(null);
    this.lookupResult.set(null);
    this.showNombreFields.set(false);
    this.form.reset({ nombre: '', apellido: '', tipo_documento: 'DNI', numero_documento: '', historia_clinica: '', notas: '' });
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  onDocumentoBlur(): void {
    if (this.editingUuid()) return;
    const numero = (this.form.get('numero_documento')?.value ?? '').trim();
    if (!numero) { this.lookupResult.set(null); this.showNombreFields.set(false); return; }

    this.lookupLoading.set(true);
    this.lookup.lookup(numero).subscribe(result => {
      this.lookupLoading.set(false);
      this.lookupResult.set(result);
      if (result?.nombre || result?.apellido) {
        this.form.patchValue({ nombre: result.nombre, apellido: result.apellido });
        this.showNombreFields.set(true);
      } else {
        this.form.patchValue({ nombre: '', apellido: '' });
        this.showNombreFields.set(false);
      }
    });
  }

  openEdit(patient: Patient): void {
    this.editingUuid.set(patient.uuid);
    this.lookupResult.set(null);
    this.form.patchValue({
      nombre:           patient.nombre ?? '',
      apellido:         patient.apellido ?? '',
      tipo_documento:   patient.tipo_documento ?? 'DNI',
      numero_documento: patient.numero_documento ?? '',
      historia_clinica: patient.historia_clinica ?? '',
      notas:            patient.notas ?? '',
    });
    this.showNombreFields.set(!!(patient.nombre || patient.apellido));
    this.showForm.set(true);
    this.errorMessage.set(null);
  }

  cancelForm(): void { this.showForm.set(false); this.editingUuid.set(null); }

  save(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMessage.set(null);
    const data = this.form.value;
    const uuid = this.editingUuid();
    const req$ = uuid ? this.api.updatePatient(uuid, data) : this.api.createPatient(data);
    req$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showForm.set(false);
        this.editingUuid.set(null);
        this.alert.success(uuid ? 'Paciente actualizado correctamente.' : 'Paciente registrado correctamente.');
        this.loadPage(this.currentPage());
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message ?? 'Error al guardar el paciente.');
      },
    });
  }

  async deletePatient(uuid: string): Promise<void> {
    const result = await this.alert.delete('¡No podrás revertir esto!', '¿Eliminar paciente?');
    if (!result.isConfirmed) return;
    try {
      await firstValueFrom(this.api.deletePatient(uuid));
      this.alert.toast('Paciente eliminado.', 'success');
      this.loadPage(this.currentPage());
    } catch {
      this.alert.error('No se pudo eliminar el paciente.');
    }
  }

  // === SEXO FILTER ===
  setSexoFilter(val: string): void { this.sexoFilter.set(val); this.showFilters.set(false); this.loadPage(1); }

  toggleFilters(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.showFilters()) {
      this.filtersPos.set(getDropdownPos(event));
      this.showFilters.set(true);
    } else {
      this.showFilters.set(false);
    }
  }

  clearFilters(): void { this.sexoFilter.set(''); this.showFilters.set(false); this.loadPage(1); }

  // === THREE-DOTS MENU ===
  toggleMenu(uuid: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openMenuId() === uuid) { this.openMenuId.set(null); return; }
    this.menuPos.set(getDropdownPos(event, 192));
    this.openMenuId.set(uuid);
  }

  // === HISTORY MODAL ===
  openHistory(uuid: string): void {
    const patient = this.patients().find(p => p.uuid === uuid);
    if (!patient) return;
    this.openMenuId.set(null);
    this.historyPatient.set(patient);
    this.showHistoryModal.set(true);
  }

  closeHistory(): void { this.showHistoryModal.set(false); }

  openVincular(uuid: string): void {
    const patient = this.patients().find(p => p.uuid === uuid);
    if (!patient) return;
    this.openMenuId.set(null);
    this.vincularPatient.set(patient);
    this.showVincularModal.set(true);
  }

  onVincularSaved(): void {
    this.showVincularModal.set(false);
    this.loadPage(this.currentPage());
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.showFilters.set(false);
    this.openMenuId.set(null);
  }

  // === HELPERS ===
  trackById(_: number, item: { id: number }): number { return item.id; }
  trackByIndex(i: number): number { return i; }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }
}
