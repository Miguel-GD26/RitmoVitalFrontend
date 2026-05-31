export type TipoDocumento = 'DNI' | 'CE' | 'PAS' | 'RUC' | 'OTR';

export interface Patient {
  id: number;
  uuid: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  sexo: 'M' | 'F' | 'O' | '';
  tipo_documento: TipoDocumento;
  numero_documento: string;
  historia_clinica: string;
  notas: string;
  creado_por_nombre: string | null;
  fecha_registro: string;
  total_analisis: number;
  usuario_uuid: string | null;
}

export interface PatientForm {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  sexo: string;
  tipo_documento: string;
  numero_documento: string;
  historia_clinica: string;
  notas: string;
}
