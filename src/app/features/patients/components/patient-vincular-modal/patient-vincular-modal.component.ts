import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Patient } from '@core/models/patient.model';
import { PatientsApiService } from '../../services/patients-api.service';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AlertService } from '@core/services/alert';

@Component({
  selector: 'app-patient-vincular-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppModalComponent],
  templateUrl: './patient-vincular-modal.component.html',
})
export class PatientVincularModalComponent {
  private readonly api   = inject(PatientsApiService);
  private readonly fb    = inject(FormBuilder);
  private readonly alert = inject(AlertService);

  readonly patient = input.required<Patient>();
  readonly saved   = output<void>();
  readonly closed  = output<void>();

  isSaving  = signal(false);
  errorMsg  = signal<string | null>(null);
  showPass  = signal(false);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
  });

  get f() { return this.form.controls; }

  get alreadyLinked(): boolean { return !!this.patient().usuario_uuid; }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.form.value;
    const body: { email: string; password?: string } = { email: email! };
    if (password) body['password'] = password;

    this.api.vincularCuenta(this.patient().uuid, body).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.alert.success('Cuenta vinculada correctamente.');
        this.saved.emit();
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMsg.set(err.error?.message ?? 'Error al vincular la cuenta.');
      },
    });
  }

  desvincular(): void {
    this.alert.delete('El paciente quedará sin cuenta de acceso.', '¿Desvincular cuenta?').then(r => {
      if (!r.isConfirmed) return;
      this.api.desvincularCuenta(this.patient().uuid).subscribe({
        next: () => { this.alert.success('Cuenta desvinculada.'); this.saved.emit(); },
        error: () => { this.alert.error('No se pudo desvincular la cuenta.'); },
      });
    });
  }
}
