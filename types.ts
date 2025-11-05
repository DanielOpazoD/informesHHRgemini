
// FIX: Added Patient interface to resolve import error in components/PatientInfo.tsx.
export interface Patient {
    nombre: string;
    apellido: string;
    rut: string;
    fechaNacimiento: string;
    prevision: string;
    ficha: string;
}

export interface PatientField {
    id?: string;
    label: string;
    value: string;
    type: 'text' | 'date' | 'number';
    placeholder?: string;
    readonly?: boolean;
    isCustom?: boolean;
}

// FIX: Added ClinicalField and ClinicalSection interfaces to resolve import error in components/ClinicalSection.tsx.
export interface ClinicalField {
    label: string;
    value: string;
    type: 'text' | 'textarea';
}

export interface ClinicalSection {
    title: string;
    fields: ClinicalField[];
}

export interface ClinicalSectionData {
    title: string;
    content: string;
}

export interface ClinicalRecord {
    version: string;
    templateId: string;
    title: string;
    patientFields: PatientField[];
    sections: ClinicalSectionData[];
    medico: string;
    especialidad: string;
}

export interface Template {
    id: string;
    name: string;
    title: string;
}

export interface GoogleUserProfile {
    name: string;
    email: string;
    picture: string;
}

export interface DriveFolder {
    id: string;
    name: string;
}