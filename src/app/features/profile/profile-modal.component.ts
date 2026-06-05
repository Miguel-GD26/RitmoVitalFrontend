import { Component, OnInit, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileApiService, UserProfile, TwoFASetupResponse } from '@core/services/profile/profile-api.service';
import { AuthService } from '@core/services/auth/auth.service';
import { AlertService } from '@core/services/alert';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AppFormSelectComponent, SelectOption } from '@shared/components/app-form-select/app-form-select.component';
import { AppDatePickerComponent } from '@shared/components/app-date-picker/app-date-picker.component';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppModalComponent, AppFormSelectComponent, AppDatePickerComponent],
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.css'],
})
export class ProfileModalComponent implements OnInit {
  private readonly api   = inject(ProfileApiService);
  private readonly auth  = inject(AuthService);
  private readonly fb    = inject(FormBuilder);
  private readonly alert = inject(AlertService);

  readonly closed = output<void>();

  profile       = signal<UserProfile | null>(null);
  isLoading     = signal(true);
  isSaving      = signal(false);
  isSavingPwd   = signal(false);
  errorMsg      = signal<string | null>(null);
  pwdErrorMsg   = signal<string | null>(null);
  avatarFile    = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  activeTab     = signal<'datos' | 'password' | 'seguridad'>('datos');
  showCurPass   = signal(false);
  showNewPass   = signal(false);
  showConfPwd   = signal(false);

  // 2FA state
  twoFASetup    = signal<TwoFASetupResponse | null>(null);
  twoFACode     = signal('');
  isLoading2FA  = signal(false);
  twoFAError    = signal<string | null>(null);
  showDisable   = signal(false);
  disableCode   = signal('');

  readonly tabs = [
    { id: 'datos'     as const, label: 'Mis datos',  icon: 'fas fa-user' },
    { id: 'password'  as const, label: 'Contraseña', icon: 'fas fa-lock' },
    { id: 'seguridad' as const, label: 'Seguridad',  icon: 'fas fa-shield-alt' },
  ];

  readonly selectedRole   = computed(() => this.profile()?.groups[0] ?? '');
  readonly isMedico       = computed(() => this.selectedRole() === 'medico');
  readonly isInvestigador = computed(() => this.selectedRole() === 'investigador');
  readonly emailVerified  = computed(() => this.profile()?.email_verified ?? false);

  readonly sexoOptions: SelectOption[] = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'O', label: 'Otro' },
  ];

  readonly avatarInitials = computed(() => {
    const p = this.profile();
    if (!p) return '?';
    if (p.first_name || p.last_name)
      return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();
    return (p.username?.[0] ?? '?').toUpperCase();
  });

  form = this.fb.group({
    username:           ['', Validators.required],
    first_name:         ['', Validators.required],
    last_name:          ['', Validators.required],
    fecha_nacimiento:   [''],
    sexo:               [''],
    numero_colegiatura: [''],
    orcid:              [''],
    institucion:        [''],
  });

  pwdForm = this.fb.group({
    current_password: ['', Validators.required],
    new_password:     ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', Validators.required],
  });

  // Signals reactivos de los campos de contraseña (para el checklist en vivo)
  private readonly _newPwd  = toSignal(this.pwdForm.get('new_password')!.valueChanges,     { initialValue: '' });
  private readonly _curPwd  = toSignal(this.pwdForm.get('current_password')!.valueChanges, { initialValue: '' });
  private readonly _confPwd = toSignal(this.pwdForm.get('confirm_password')!.valueChanges, { initialValue: '' });

  readonly pwdLengthOk = computed(() => (this._newPwd()?.length ?? 0) >= 8);
  readonly pwdMatchOk  = computed(() => !!this._newPwd() && this._newPwd() === this._confPwd());
  readonly pwdDiffOk   = computed(() => !!this._newPwd() && !!this._curPwd() && this._newPwd() !== this._curPwd());

  get f()  { return this.form.controls; }
  get pf() { return this.pwdForm.controls; }

  ngOnInit(): void {
    this.api.getProfile().subscribe({
      next: p => {
        this.profile.set(p);
        this.avatarPreview.set(p.avatar_url);
        this.form.patchValue({
          username:           p.username,
          first_name:         p.first_name,
          last_name:          p.last_name,
          fecha_nacimiento:   p.fecha_nacimiento ?? '',
          sexo:               p.sexo,
          numero_colegiatura: p.numero_colegiatura,
          orcid:              p.orcid,
          institucion:        p.institucion,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el perfil.');
        this.isLoading.set(false);
      },
    });
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

    const data = this.form.value as any;
    this.api.updateProfile(data).subscribe({
      next: updated => {
        this.profile.set(updated);
        const file = this.avatarFile();
        if (file) {
          this.api.uploadAvatar(file).subscribe({
            next: res => {
              this.auth.currentUser.update(u => u ? { ...u, avatar_url: res.avatar_url } : u);
              this.isSaving.set(false);
              this.alert.success('Perfil actualizado.');
              this.closed.emit();
            },
            error: () => {
              this.isSaving.set(false);
              this.alert.success('Perfil actualizado. El avatar no se pudo subir.');
              this.closed.emit();
            },
          });
        } else {
          this.isSaving.set(false);
          this.alert.success('Perfil actualizado.');
          this.closed.emit();
        }
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMsg.set(err.error?.message ?? 'Error al actualizar el perfil.');
      },
    });
  }

  // ── 2FA ───────────────────────────────────────────────────────────────────

  qrUrl(uri: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uri)}&size=180x180&ecc=M`;
  }

  start2faSetup(): void {
    this.isLoading2FA.set(true);
    this.twoFAError.set(null);
    this.api.get2faSetup().subscribe({
      next: data => { this.twoFASetup.set(data); this.isLoading2FA.set(false); },
      error: err  => { this.twoFAError.set(err.error?.message ?? 'Error al iniciar 2FA.'); this.isLoading2FA.set(false); },
    });
  }

  confirm2fa(): void {
    const code = this.twoFACode().trim();
    if (code.length !== 6) { this.twoFAError.set('Ingresa un código de 6 dígitos.'); return; }
    this.isLoading2FA.set(true);
    this.twoFAError.set(null);
    this.api.confirm2fa(code).subscribe({
      next: () => {
        this.isLoading2FA.set(false);
        this.twoFASetup.set(null);
        this.twoFACode.set('');
        this.profile.update(p => p ? { ...p, totp_enabled: true } : p);
        this.alert.success('Autenticación de dos factores activada.');
      },
      error: err => { this.twoFAError.set(err.error?.message ?? 'Código incorrecto.'); this.isLoading2FA.set(false); },
    });
  }

  disable2fa(): void {
    const code = this.disableCode().trim();
    if (code.length !== 6) { this.twoFAError.set('Ingresa un código de 6 dígitos.'); return; }
    this.isLoading2FA.set(true);
    this.twoFAError.set(null);
    this.api.disable2fa(code).subscribe({
      next: () => {
        this.isLoading2FA.set(false);
        this.showDisable.set(false);
        this.disableCode.set('');
        this.profile.update(p => p ? { ...p, totp_enabled: false } : p);
        this.alert.success('Autenticación de dos factores desactivada.');
      },
      error: err => { this.twoFAError.set(err.error?.message ?? 'Código incorrecto.'); this.isLoading2FA.set(false); },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    this.pf['new_password'].setValue(pwd);
    this.pf['confirm_password'].setValue(pwd);
    this.pf['new_password'].markAsTouched();
    this.pf['confirm_password'].markAsTouched();
    this.showNewPass.set(true);
    this.showConfPwd.set(true);
  }

  submitPassword(): void {
    this.pwdForm.markAllAsTouched();
    if (this.pwdForm.invalid || this.isSavingPwd()) return;

    const { current_password, new_password, confirm_password } = this.pwdForm.value;
    if (new_password !== confirm_password) {
      this.pwdErrorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    this.isSavingPwd.set(true);
    this.pwdErrorMsg.set(null);

    this.api.changePassword({ current_password: current_password!, new_password: new_password! }).subscribe({
      next: () => {
        this.isSavingPwd.set(false);
        this.pwdForm.reset();
        this.activeTab.set('datos');
        this.alert.success('Contraseña actualizada correctamente.');
      },
      error: err => {
        this.isSavingPwd.set(false);
        this.pwdErrorMsg.set(err.error?.message ?? 'Error al cambiar la contraseña.');
      },
    });
  }
}
