import { Component, inject, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AdminApiService } from '../../../services/admin-api.service';
import { CreateUserRequest } from '../../../models/admin-user.model';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AppFormSelectComponent, SelectOption } from '@shared/components/app-form-select/app-form-select.component';
import { AppDatePickerComponent } from '@shared/components/app-date-picker/app-date-picker.component';
import { AlertService } from '@core/services/alert';
import { LookupService, DocumentoLookupResult } from '@core/services/lookup/lookup.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pwd  = control.get('password')?.value;
  const conf = control.get('confirm_password')?.value;
  return pwd && conf && pwd !== conf ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-user-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppModalComponent, AppFormSelectComponent, AppDatePickerComponent],
  templateUrl: './user-create-modal.component.html',
  styleUrls: ['./user-create-modal.component.css'],
})
export class UserCreateModalComponent implements OnInit {
  private readonly api    = inject(AdminApiService);
  private readonly fb     = inject(FormBuilder);
  private readonly alert  = inject(AlertService);
  private readonly lookup = inject(LookupService);

  readonly saved  = output<void>();
  readonly closed = output<void>();

  readonly roleOptions: SelectOption[] = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'medico',        label: 'Médico' },
    { value: 'paciente',      label: 'Paciente' },
    { value: 'investigador',  label: 'Investigador' },
  ];

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

  lookupLoading = signal(false);
  isSaving      = signal(false);
  errorMsg        = signal<string | null>(null);
  showPass        = signal(false);
  showConfirmPass = signal(false);
  avatarFile      = signal<File | null>(null);
  avatarPreview   = signal<string | null>(null);

  form = this.fb.group({
    first_name:       ['', Validators.required],
    last_name:        ['', Validators.required],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', Validators.required],
    role:             ['medico' as string, Validators.required],
    tipo_documento:   ['DNI'],
    numero_documento: ['', Validators.maxLength(20)],
    fecha_nacimiento: [''],
    sexo:             [''],
    numero_colegiatura: [''],
    orcid:            [''],
    institucion:      [''],
  }, { validators: passwordsMatch });

  get f() { return this.form.controls; }

  get passwordsMismatch(): boolean {
    return this.form.hasError('passwordsMismatch') &&
           (this.f['confirm_password'].dirty || this.f['confirm_password'].touched);
  }

  selectedRole = signal<string>('medico');
  readonly isMedico       = computed(() => this.selectedRole() === 'medico');
  readonly isInvestigador = computed(() => this.selectedRole() === 'investigador');

  ngOnInit(): void {
    this.f['role'].valueChanges.subscribe(val => this.selectedRole.set(val ?? 'medico'));
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

  readonly avatarInitials = computed(() => {
    const fn = (this.f['first_name'].value ?? '').trim();
    const ln = (this.f['last_name'].value ?? '').trim();
    if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase();
    const em = (this.f['email'].value ?? '').trim();
    return em ? em[0].toUpperCase() : '?';
  });

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
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

  onDocumentoBlur(): void {
    const numero = (this.f['numero_documento'].value ?? '').trim();
    if (!numero) return;
    this.lookupLoading.set(true);
    this.lookup.lookup(numero).subscribe(result => {
      this.lookupLoading.set(false);
      if (result?.nombre || result?.apellido) {
        this.f['first_name'].setValue(result!.nombre);
        this.f['last_name'].setValue(result!.apellido);
      }
    });
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    this.f['password'].setValue(pwd);
    this.f['confirm_password'].setValue(pwd);
    this.f['password'].markAsTouched();
    this.f['confirm_password'].markAsTouched();
    this.showPass.set(true);
    this.showConfirmPass.set(true);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMsg.set(null);

    const { confirm_password, ...payload } = this.form.value;
    this.api.createUser(payload as CreateUserRequest).subscribe({
      next: res => {
        const file = this.avatarFile();
        if (file && res.data?.uuid) {
          this.api.uploadAvatar(res.data.uuid, file).subscribe({
            next:  () => { this.isSaving.set(false); this.alert.success('Usuario creado correctamente.'); this.saved.emit(); },
            error: () => { this.isSaving.set(false); this.alert.success('Usuario creado, pero el avatar no se pudo subir.'); this.saved.emit(); },
          });
        } else {
          this.isSaving.set(false);
          this.alert.success('Usuario creado correctamente.');
          this.saved.emit();
        }
      },
      error: err => {
        this.isSaving.set(false);
        const errs = err.error?.errors ?? {};
        const first = Object.values(errs)[0];
        this.errorMsg.set(Array.isArray(first) ? (first as string[])[0] : (err.error?.message ?? 'Error al crear el usuario.'));
      },
    });
  }
}
