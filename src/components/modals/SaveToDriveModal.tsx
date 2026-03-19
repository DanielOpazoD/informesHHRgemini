import React from 'react';
import type { DriveFolder, FavoriteFolderEntry } from '../../types';

type SaveFormat = 'json' | 'pdf' | 'both';

interface SaveToDriveModalProps {
    isOpen: boolean;
    isDriveLoading: boolean;
    isSaving: boolean;
    saveFormat: SaveFormat;
    fileNameInput: string;
    defaultDriveFileName: string;
    folderPath: DriveFolder[];
    driveFolders: DriveFolder[];
    favoriteFolders: FavoriteFolderEntry[];
    newFolderName: string;
    onClose: () => void;
    onSave: () => void;
    onAddFavorite: () => void;
    onRemoveFavorite: (id: string) => void;
    onGoToFavorite: (favorite: FavoriteFolderEntry) => void;
    onBreadcrumbClick: (folderId: string, index: number) => void;
    onFolderClick: (folder: DriveFolder) => void;
    onSaveFormatChange: (format: SaveFormat) => void;
    onFileNameInputChange: (value: string) => void;
    onNewFolderNameChange: (value: string) => void;
    onCreateFolder: () => void;
    onSetDefaultFolder: () => void;
}

const SaveToDriveModal: React.FC<SaveToDriveModalProps> = ({
    isOpen,
    isDriveLoading,
    isSaving,
    saveFormat,
    fileNameInput,
    defaultDriveFileName,
    folderPath,
    driveFolders,
    favoriteFolders,
    newFolderName,
    onClose,
    onSave,
    onAddFavorite,
    onRemoveFavorite,
    onGoToFavorite,
    onBreadcrumbClick,
    onFolderClick,
    onSaveFormatChange,
    onFileNameInputChange,
    onNewFolderNameChange,
    onCreateFolder,
    onSetDefaultFolder,
}) => {
    if (!isOpen) return null;

    const isCreateDisabled = isDriveLoading || !newFolderName.trim();

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <div className="modal-title">Guardar en Google Drive</div>
                    <button onClick={onClose} className="modal-close">&times;</button>
                </div>
                <div>
                    <div className="lbl">Formato</div>
                    <div className="flex gap-4">
                        <label>
                            <input
                                type="radio"
                                name="format"
                                value="json"
                                checked={saveFormat === 'json'}
                                onChange={() => onSaveFormatChange('json')}
                            />{' '}
                            JSON
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="format"
                                value="pdf"
                                checked={saveFormat === 'pdf'}
                                onChange={() => onSaveFormatChange('pdf')}
                            />{' '}
                            PDF
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="format"
                                value="both"
                                checked={saveFormat === 'both'}
                                onChange={() => onSaveFormatChange('both')}
                            />{' '}
                            Ambos
                        </label>
                    </div>
                </div>
                <div>
                    <div className="lbl">Nombre del archivo</div>
                    <input
                        type="text"
                        className="inp"
                        value={fileNameInput}
                        onChange={e => onFileNameInputChange(e.target.value)}
                        placeholder={defaultDriveFileName}
                    />
                    <div className="input-hint">
                        No incluyas la extensión; se agregará automáticamente según el formato seleccionado.
                    </div>
                </div>
                <div>
                    <div className="lbl">Ubicación</div>
                    <div className="breadcrumb flex gap-1">
                        {folderPath.map((folder, index) => (
                            <React.Fragment key={folder.id}>
                                <span className="breadcrumb-item" onClick={() => onBreadcrumbClick(folder.id, index)}>
                                    {folder.name}
                                </span>
                                {index < folderPath.length - 1 && <span>/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="favorites-actions">
                        <button className="btn" onClick={onAddFavorite}>
                            Agregar carpeta a favoritos
                        </button>
                    </div>
                    {favoriteFolders.length > 0 && (
                        <div className="favorites-row">
                            <span className="favorites-label">Favoritos:</span>
                            {favoriteFolders.map(fav => (
                                <div key={fav.id} className="favorite-pill">
                                    <button type="button" onClick={() => onGoToFavorite(fav)}>
                                        {fav.name}
                                    </button>
                                    <button type="button" onClick={() => onRemoveFavorite(fav.id)} title="Quitar">
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="folder-list">
                        {isDriveLoading ? (
                            <div className="p-4 text-center">Cargando...</div>
                        ) : (
                            driveFolders.map(folder => (
                                <div key={folder.id} className="folder-item" onClick={() => onFolderClick(folder)}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        fill="currentColor"
                                        viewBox="0 0 16 16"
                                    >
                                        <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .54-1.31zM2.19 4a1 1 0 0 0-.996.886l-.637 7A1 1 0 0 0 1.558 13h10.617a1 1 0 0 0 .996-.886l-.637-7A1 1 0 0 0 11.826 4H2.19z" />
                                    </svg>
                                    {folder.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div>
                    <div className="lbl">Crear nueva carpeta aquí</div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="inp flex-grow"
                            value={newFolderName}
                            onChange={e => onNewFolderNameChange(e.target.value)}
                            placeholder="Nombre de la carpeta"
                        />
                        <button className="btn" onClick={onCreateFolder} disabled={isCreateDisabled}>
                            Crear
                        </button>
                    </div>
                </div>
                <div className="modal-footer">
                    <div>
                        <button className="btn" onClick={onSetDefaultFolder}>
                            Establecer como predeterminada
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn" onClick={onClose}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={onSave} disabled={isSaving || isDriveLoading}>
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaveToDriveModal;
