import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, ValidatorFn } from '@angular/forms';
import { AdminApiService } from '../../../services/admin-api.service';
import { AdminUser, UpdateUserRequest } from '../../../models/admin-user.model';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AppFormSelectComponent, SelectOption } from '@shared/components/app-form-select/app-form-select.component';
import { AppDatePickerComponent } from '@shared/components/app-date-picker/app-date-picker.component';
import { AlertService } from '@core/services/alert';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';

@Component({
  selector: 'app-user-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppModalComponent, AppFormSelectComponent, AppDatePickerComponent, FormatDatePipe],
  templateUrl: './user-edit-modal.component.html',
  styleUrls: ['./user-edit-modal.component.css'],
})
export class UserEditModalComponent implements OnInit {
  private readonly api   = inject(AdminApiService);
  private readonly fb    = inject(FormBuilder);
  private readonly alert = inject(AlertService);

  readonly user   = input.required<AdminUser>();
  readonly saved  = output<void>();
  readonly closed = output<void>();

  readonly roleOptions: SelectOption[] = [
    { value: '',              label: 'Sin rol asignado' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'medico',        label: 'Médico' },
    { value: 'paciente',      label: 'Paciente' },
    { value: 'investigador',  label: 'Investigador' },
  ];

  isSaving      = signal(false);
  errorMsg      = signal<string | null>(null);
  avatarFile    = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  selectedRole  = signal<string>('');

  readonly isMedico       = computed(() => this.selectedRole() === 'medico');
  readonly isInvestigador = computed(() => this.selectedRole() === 'investigador');

  readonly tipoDocOptions: SelectOption[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE',  label: 'Carné de Extranjería' },
    { value: 'PAS', label: 'Pasaporte' },
    { value: 'OTR', label: 'Otro' },
  ];

  readonly sexoOptions: SelectOption[] = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
  ];

  private readonly docPatterns: Record<string, RegExp | null> = {
    DNI: /^[0-9]{8}$/,
    CE:  /^[0-9]{9}$/,
    PAS: /^[A-Za-z0-9]{3,20}$/,
    OTR: null,
  };

  readonly docErrorMessages: Record<string, string> = {
    DNI: 'El DNI debe tener exactamente 8 dígitos.',
    CE:  'El CE debe tener exactamente 9 dígitos.',
    PAS: 'El pasaporte debe tener entre 3 y 20 caracteres alfanuméricos.',
    OTR: 'Documento no válido.',
  };

  private readonly docMaxLengths: Record<string, number> = {
    DNI: 8,
    CE:  9,
    PAS: 20,
    OTR: 50,
  };

  selectedTipoDoc = signal<string>('DNI');
  readonly docErrorMessage = computed(() => this.docErrorMessages[this.selectedTipoDoc()] ?? '');
  readonly docMaxLength    = computed(() => this.docMaxLengths[this.selectedTipoDoc()] ?? 50);

  readonly avatarInitials = computed(() => {
    const u = this.user();
    const fn = u.first_name?.trim() ?? '';
    const ln = u.last_name?.trim() ?? '';
    if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase();
    return (u.username?.[0] ?? '?').toUpperCase();
  });

  form = this.fb.group({
    first_name:         ['', Validators.required],
    last_name:          ['', Validators.required],
    role:               [''],
    is_active:          [true],
    tipo_documento:     ['DNI'],
    numero_documento:   [''],
    fecha_nacimiento:   [''],
    sexo:               [''],
    numero_colegiatura: [''],
    orcid:              [''],
    institucion:        [''],
  });

  get f() { return this.form.controls; }

  ngOnInit(): void {
    const u = this.user();
    this.form.patchValue({
      first_name:         u.first_name,
      last_name:          u.last_name,
      role:               u.role ?? '',
      is_active:          u.is_active,
      tipo_documento:     u.tipo_documento ?? 'DNI',
      numero_documento:   u.numero_documento ?? '',
      fecha_nacimiento:   u.fecha_nacimiento ?? '',
      sexo:               u.sexo ?? '',
      numero_colegiatura: u.numero_colegiatura ?? '',
      orcid:              u.orcid ?? '',
      institucion:        u.institucion ?? '',
    });
    this.selectedRole.set(u.role ?? '');
    this.selectedTipoDoc.set(u.tipo_documento ?? 'DNI');
    if (u.avatar_url) this.avatarPreview.set(u.avatar_url);
    this.f['role'].valueChanges.subscribe(val => this.selectedRole.set(val ?? ''));
    this.f['tipo_documento'].valueChanges.subscribe(tipo => {
      const t = tipo ?? 'DNI';
      this.selectedTipoDoc.set(t);
      this.f['numero_documento'].setValue('');
      this.updateDocumentoValidation(t);
    });
    this.updateDocumentoValidation(this.f['tipo_documento'].value ?? 'DNI');
  }

  private updateDocumentoValidation(tipo: string): void {
    const ctrl = this.f['numero_documento'];
    const pattern = this.docPatterns[tipo];
    const validators: ValidatorFn[] = pattern ? [Validators.pattern(pattern)] : [];
    ctrl.setValidators(validators);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  onDocumentoInput(event: Event): void {
    const tipo = this.selectedTipoDoc();
    if (tipo === 'DNI' || tipo === 'CE') {
      const input = event.target as HTMLInputElement;
      const clean = input.value.replace(/[^0-9]/g, '');
      if (clean !== input.value) {
        this.f['numero_documento'].setValue(clean, { emitEvent: false });
        input.value = clean;
      }
    }
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMsg.set(null);

    const data: UpdateUserRequest = this.form.value as UpdateUserRequest;
    this.api.updateUser(this.user().uuid, data).subscribe({
      next: () => {
        const file = this.avatarFile();
        if (file) {
          this.api.uploadAvatar(this.user().uuid, file).subscribe({
            next:  () => { this.isSaving.set(false); this.alert.success('Usuario actualizado.'); this.saved.emit(); },
            error: () => { this.isSaving.set(false); this.alert.success('Usuario actualizado, pero el avatar no se pudo subir.'); this.saved.emit(); },
          });
        } else {
          this.isSaving.set(false);
          this.alert.success('Usuario actualizado.');
          this.saved.emit();
        }
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMsg.set(err.error?.message ?? 'Error al actualizar el usuario.');
      },
    });
  }
}
