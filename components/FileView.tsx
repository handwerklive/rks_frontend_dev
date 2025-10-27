import React, { useRef, useState } from 'react';
import { View, AppFile } from '../types';
import Header from './Header';
import ConfirmationDialog from './ConfirmationDialog';
import PlusIcon from './icons/PlusIcon';
import FileTextIcon from './icons/FileTextIcon';
import TrashIcon from './icons/TrashIcon';

interface FileViewProps {
  files: AppFile[];
  onAddFile: (file: File) => void;
  onDeleteFile: (fileId: number) => void;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
}

const FileView: React.FC<FileViewProps> = ({ files, onAddFile, onDeleteFile, onNavigate, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToDelete, setFileToDelete] = useState<AppFile | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('text/') || ['application/json', 'application/javascript', 'application/pdf'].includes(file.type) || file.name.endsWith('.md')) {
         onAddFile(file);
      } else {
        alert('Bitte lade nur Text-basierte Dateien hoch (z.B. .txt, .md, .json, .csv).');
      }
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };


  return (
    <div className="flex flex-col h-full text-gray-900">
      <ConfirmationDialog
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={() => {
          if (fileToDelete) {
            onDeleteFile(fileToDelete.id);
            setFileToDelete(null);
          }
        }}
        title="Dokument löschen"
        message={`Möchtest du das Dokument "${fileToDelete?.name}" wirklich endgültig löschen?`}
        confirmButtonText="Löschen"
        isDestructive={true}
      />
      <Header title="Dokumentenablage" onNavigate={onNavigate} onLogout={onLogout} showBackButton backTargetView={View.HOME} />
      
      <div className="p-4">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.md,.json,.csv,text/*,application/json,application/javascript"
        />
        <button
            onClick={handleUploadClick}
            className="group w-full flex items-center justify-center gap-2 h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-2xl transition-all duration-300 hover:opacity-90 hover:scale-[1.03]"
            aria-label="Neues Dokument hochladen"
        >
            <PlusIcon className="w-6 h-6" />
            Dokument hochladen
        </button>
        <p className="text-xs text-center text-gray-500 mt-2 px-4">
            Hochgeladene Dateien werden für Chats als Kontext verwendet. Daten werden nur lokal im Browser gespeichert.
        </p>
      </div>

      <div className="flex-1 p-4 pt-0 space-y-3 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <FileTextIcon className="w-16 h-16 mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700">Keine Dokumente</h2>
            <p>Lade eine Datei hoch, um sie in Chats zu verwenden.</p>
          </div>
        ) : (
          files.map(file => (
            <div
              key={file.id}
              className="group w-full p-4 bg-white rounded-2xl border border-gray-200 transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
                  <p className="text-sm text-gray-600">Hochgeladen am {formatDate(file.created_at)}</p>
              </div>
              
              <div className="flex-shrink-0">
                  <button 
                    onClick={() => setFileToDelete(file)}
                    className="w-10 h-10 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 hover:bg-red-200/80"
                    aria-label="Dokument löschen"
                 >
                    <TrashIcon className="w-5 h-5"/>
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileView;