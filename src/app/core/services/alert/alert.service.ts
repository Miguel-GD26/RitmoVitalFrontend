import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {

  success(message: string, title = '¡Éxito!') {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: 'var(--accent, #174a7a)',
      timer: 3000,
      timerProgressBar: true,
      customClass: { container: 'swal2-above-modal' },
    });
  }

  error(message: string, title = '¡Error!') {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: 'var(--accent, #174a7a)',
      customClass: { container: 'swal2-above-modal' },
    });
  }

  warning(message: string, title = '¡Advertencia!') {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: 'var(--accent, #174a7a)',
      customClass: { container: 'swal2-above-modal' },
    });
  }

  info(message: string, title = 'Información') {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: 'var(--accent, #174a7a)',
    });
  }

  confirm(message: string, title = '¿Estás seguro?') {
    return Swal.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent, #174a7a)',
      cancelButtonColor: '#64748B',
      reverseButtons: true,
    });
  }

  delete(message = '¡No podrás revertir esto!', title = '¿Eliminar?') {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      reverseButtons: true,
    });
  }

  toast(message: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') {
    return Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
    }).fire({ icon, title: message });
  }

  loading(message = 'Procesando...', title = 'Por favor espera') {
    return Swal.fire({
      title,
      text: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
      customClass: { container: 'swal2-above-modal' },
    });
  }

  close() {
    Swal.close();
  }
}
