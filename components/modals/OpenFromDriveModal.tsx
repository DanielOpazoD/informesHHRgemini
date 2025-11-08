import React from 'react';
import type { DriveFolder, FavoriteFolderEntry, RecentDriveFile } from '../../types';

interface OpenFromDriveModalProps {
    isOpen: boolean;
    isDriveLoading: boolean;
    folderPath: DriveFolder[];
    driveFolders: DriveFolder[];
    driveJsonFiles: DriveFolder[];
    driveSearchTerm: string;
    driveDateFrom: string;
    driveDateTo: string;
    driveContentTerm: string;
    favoriteFolders: FavoriteFolderEntry[];
    recentFiles: RecentDriveFile[];
    formatDriveDate: (value?: string) => string;
    onClose: () => void;
    onSearch: () => void;
    onClearSearch: () => void;
    onAddFavorite: () => void;
    onRemoveFavorite: (id: string) => void;
    onGoToFavorite: (favorite: FavoriteFolderEntry) => void;
    onBreadcrumbClick: (folderId: string, index: number) => void;
    onFolderClick: (folder: DriveFolder) => void;
    onFileOpen: (file: DriveFolder) => void;
    onSearchTermChange: (value: string) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onContentTermChange: (value: string) => void;
}

const OpenFromDriveModal: React.FC<OpenFromDriveModalProps> = ({
    isOpen,
    isDriveLoading,
    folderPath,
    driveFolders,
    driveJsonFiles,
    driveSearchTerm,
    driveDateFrom,
    driveDateTo,
    driveContentTerm,
    favoriteFolders,
    recentFiles,
    formatDriveDate,
    onClose,
    onSearch,
    onClearSearch,
    onAddFavorite,
    onRemoveFavorite,
    onGoToFavorite,
    onBreadcrumbClick,
    onFolderClick,
    onFileOpen,
    onSearchTermChange,
    onDateFromChange,
    onDateToChange,
    onContentTermChange,
}) => {
    if (!isOpen) return null;

    const isSearchFolder = folderPath[folderPath.length - 1]?.id === 'search';

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <div className="modal-title">Abrir desde Drive</div>
                    <button onClick={onClose} className="modal-close">&times;</button>
                </div>
                <div>
                    {isDriveLoading && <div className="drive-progress">⌛ Cargando información de Drive…</div>}
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
                    <div className="drive-search-grid">
                        <input
                            className="inp"
                            type="text"
                            placeholder="Nombre o paciente"
                            value={driveSearchTerm}
                            onChange={e => onSearchTermChange(e.target.value)}
                        />
                        <input className="inp" type="date" value={driveDateFrom} onChange={e => onDateFromChange(e.target.value)} />
                        <input className="inp" type="date" value={driveDateTo} onChange={e => onDateToChange(e.target.value)} />
                        <input
                            className="inp"
                            type="text"
                            placeholder="Buscar en contenido"
                            value={driveContentTerm}
                            onChange={e => onContentTermChange(e.target.value)}
                        />
                        <div className="drive-search-actions">
                            <button className="btn" onClick={onSearch} disabled={isDriveLoading}>
                                Buscar
                            </button>
                            <button className="btn" onClick={onClearSearch} disabled={isDriveLoading}>
                                Limpiar
                            </button>
                        </div>
                    </div>
                    <div className="favorites-actions">
                        <button className="btn" onClick={onAddFavorite} disabled={isSearchFolder}>
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
                    {recentFiles.length > 0 && (
                        <div className="favorites-row">
                            <span className="favorites-label">Recientes:</span>
                            {recentFiles.map(file => {
                                const openedAt = new Date(file.openedAt).toLocaleString('es-CL', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                });
                                return (
                                    <button
                                        key={file.id}
                                        className="favorite-chip"
                                        onClick={() => onFileOpen({ id: file.id, name: file.name })}
                                        title={`Último acceso: ${openedAt}`}
                                    >
                                        {file.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="folder-list">
                        {isDriveLoading ? (
                            <div className="p-4 text-center">Cargando...</div>
                        ) : (
                            <>
                                {driveFolders.map(folder => (
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
                                ))}
                                {driveJsonFiles.map(file => (
                                    <div key={file.id} className="folder-item file-item" onClick={() => onFileOpen(file)}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            fill="currentColor"
                                            viewBox="0 0 16 16"
                                        >
                                            <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM3 2v12h10V2H3zm3 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                                        </svg>
                                        <div className="file-info">
                                            <div className="file-name">{file.name}</div>
                                            <div className="file-meta">{formatDriveDate(file.modifiedTime)}</div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OpenFromDriveModal;
