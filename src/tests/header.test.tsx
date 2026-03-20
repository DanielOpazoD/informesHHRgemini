import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../components/Header';

vi.mock('../components/UserAccountMenu', () => ({
    default: () => <div>user-account-menu</div>,
}));

vi.mock('../components/EditorToolbar', () => ({
    default: ({ onToolbarCommand }: { onToolbarCommand: (command: string) => void }) => (
        <button onClick={() => onToolbarCommand('bold')}>toolbar-bold</button>
    ),
}));

const createProps = (): React.ComponentProps<typeof Header> => ({
    templateId: '2',
    onTemplateChange: vi.fn(),
    onAddClinicalUpdateSection: vi.fn(),
    onPrint: vi.fn(),
    onOpenSettings: vi.fn(),
    onRestoreTemplate: vi.fn(),
    onOpenCartolaApp: vi.fn(),
    auth: {
        isSignedIn: true,
        isGisReady: true,
        isGapiReady: true,
        isPickerApiReady: true,
        tokenClient: null,
        userProfile: null,
        onSignIn: vi.fn(),
        onSignOut: vi.fn(),
        onChangeUser: vi.fn(),
    },
    drive: {
        isSaving: false,
        hasApiKey: true,
        onSaveToDrive: vi.fn(),
        onOpenFromDrive: vi.fn(),
        onDownloadJson: vi.fn(),
    },
    editing: {
        isEditing: false,
        onToggleEdit: vi.fn(),
        isAdvancedEditing: true,
        onToggleAdvancedEditing: vi.fn(),
        isAiAssistantVisible: false,
        onToggleAiAssistant: vi.fn(),
        onToolbarCommand: vi.fn(),
    },
    save: {
        saveStatusLabel: 'Guardado',
        lastSaveTime: '10:30',
        hasUnsavedChanges: true,
        onQuickSave: vi.fn(),
        onOpenHistory: vi.fn(),
    },
});

describe('Header', () => {
    beforeEach(() => {
        const importButton = document.createElement('button');
        importButton.id = 'importJson';
        document.body.appendChild(importButton);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renderiza launcher, toolbar y menú de cuenta', () => {
        render(<Header {...createProps()} />);

        expect(screen.getByText('toolbar-bold')).toBeTruthy();
        expect(screen.getByText('user-account-menu')).toBeTruthy();
        expect(screen.getByText('Guardado')).toBeTruthy();
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2');
    });

    it('dispara acciones principales desde launcher y barra superior', () => {
        const props = createProps();
        render(<Header {...props} />);

        fireEvent.click(screen.getByLabelText('Abrir aplicaciones'));
        fireEvent.click(screen.getByText('Cartola de medicamentos'));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
        fireEvent.click(screen.getByText('Act. clínica'));
        fireEvent.click(screen.getByTitle('Desactivar edición avanzada'));
        fireEvent.click(screen.getByLabelText('Abrir asistente clínico'));
        fireEvent.click(screen.getByText('toolbar-bold'));

        expect(props.onOpenCartolaApp).toHaveBeenCalled();
        expect(props.onTemplateChange).toHaveBeenCalledWith('5');
        expect(props.onAddClinicalUpdateSection).toHaveBeenCalled();
        expect(props.editing.onToggleAdvancedEditing).toHaveBeenCalled();
        expect(props.editing.onToggleAiAssistant).toHaveBeenCalled();
        expect(props.editing.onToolbarCommand).toHaveBeenCalledWith('bold');
    });

    it('ejecuta acciones de los menús Archivo, Drive y Herramientas', () => {
        const props = createProps();
        const importClickSpy = vi.spyOn(document.getElementById('importJson') as HTMLButtonElement, 'click');
        render(<Header {...props} />);

        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Editar estructura'));
        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Guardar borrador'));
        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Imprimir PDF'));
        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Guardar JSON'));
        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Historial'));
        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Importar'));
        fireEvent.click(screen.getByText('Archivo'));
        fireEvent.click(screen.getByText('Restablecer planilla'));

        fireEvent.click(screen.getByText('Drive'));
        fireEvent.click(screen.getByText('Guardar en Drive'));
        fireEvent.click(screen.getByText('Drive'));
        fireEvent.click(screen.getByText('Abrir desde Drive'));

        fireEvent.click(screen.getByTitle('Desactivar edición avanzada'));
        fireEvent.click(screen.getByText('⚙️'));
        fireEvent.click(screen.getByText('Google API'));

        expect(props.editing.onToggleEdit).toHaveBeenCalled();
        expect(props.save.onQuickSave).toHaveBeenCalled();
        expect(props.onPrint).toHaveBeenCalled();
        expect(props.drive.onDownloadJson).toHaveBeenCalled();
        expect(props.save.onOpenHistory).toHaveBeenCalled();
        expect(importClickSpy).toHaveBeenCalled();
        expect(props.onRestoreTemplate).toHaveBeenCalled();
        expect(props.drive.onSaveToDrive).toHaveBeenCalled();
        expect(props.drive.onOpenFromDrive).toHaveBeenCalled();
        expect(props.onOpenSettings).toHaveBeenCalled();
    });
});
