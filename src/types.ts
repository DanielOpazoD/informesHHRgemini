
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
    type: 'text' | 'date' | 'number' | 'time';
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

export type ClinicalSectionKind = 'standard' | 'clinical-update';

export interface ClinicalSectionData {
    title: string;
    content: string;
    kind?: ClinicalSectionKind;
    updateDate?: string;
    updateTime?: string;
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
    modifiedTime?: string;
    mimeType?: string;
}

export interface FavoriteFolderEntry {
    id: string;
    path: DriveFolder[];
    name: string;
}

export interface RecentDriveFile {
    id: string;
    name: string;
    openedAt: number;
}

export interface VersionHistoryEntry {
    id: string;
    timestamp: number;
    record: ClinicalRecord;
}

// ── Google API types ────────────────────────────────

export interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    id_token?: string;
    error?: string;
}

export interface GoogleTokenClient {
    requestAccessToken: (options?: { prompt?: string }) => void;
    callback?: (response: GoogleTokenResponse) => void;
}

export interface GooglePickerDocument {
    id: string;
    name: string;
    mimeType: string;
    url?: string;
}

export interface GooglePickerData {
    action: string;
    docs?: GooglePickerDocument[];
    [key: string]: unknown;
}

export interface GoogleDriveFileResource {
    id: string;
    name: string;
    mimeType?: string;
    modifiedTime?: string;
    parents?: string[];
}

export type SaveFormat = 'json' | 'pdf' | 'both';

export interface SaveOptions {
    record: ClinicalRecord;
    baseFileName: string;
    format: SaveFormat;
    generatePdf: () => Promise<Blob>;
}

