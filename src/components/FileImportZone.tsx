/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';
import { parseEcotrackFile } from '../utils/parser';
import { EcotrackRow, ImportSummary } from '../types';

interface FileImportZoneProps {
  onDataLoaded: (newRows: EcotrackRow[], summary: ImportSummary) => void;
  onReset: () => void;
  summary: ImportSummary | null;
}

export default function FileImportZone({ onDataLoaded, onReset, summary }: FileImportZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setIsParsing(true);
    setErrorText(null);

    const allFileNames: string[] = [];
    let combinedRows: EcotrackRow[] = [];
    let filesParsed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        allFileNames.push(file.name);
        try {
          const { rows } = await parseEcotrackFile(file);
          combinedRows = [...combinedRows, ...rows];
          filesParsed++;
        } catch (err: any) {
          console.error(`Error parsing file ${file.name}:`, err);
          setErrorText(`Erreur lors de la lecture de "${file.name}": ${err.message || err}`);
        }
      }
    }

    if (filesParsed === 0) {
      if (!errorText) {
        setErrorText("Aucun fichier Excel (.xlsx, .xls) ou CSV valide n'a été traité.");
      }
      setIsParsing(false);
      return;
    }

    // Deduplicate combined rows by ID
    const uniqueMap = new Map<string, EcotrackRow>();
    let duplicateCount = 0;

    combinedRows.forEach(row => {
      if (uniqueMap.has(row.id)) {
        duplicateCount++;
      } else {
        uniqueMap.set(row.id, row);
      }
    });

    const finalRows = Array.from(uniqueMap.values());

    onDataLoaded(finalRows, {
      fileCount: filesParsed,
      totalRows: finalRows.length,
      ignoredDuplicates: duplicateCount,
      fileNames: allFileNames
    });

    setIsParsing(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full bg-[#0F0F11] rounded-lg shadow-lg border border-zinc-800/50 p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            Importation des exports ECOTRACK
          </h2>
          <p className="text-sm text-zinc-500">
            Glissez-déposez plusieurs fichiers exports Excel ou CSV pour fusionner et dédoublonner automatiquement.
          </p>
        </div>
        {summary && (
          <button
            onClick={() => {
              onReset();
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            id="btn-reset"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-850 rounded border border-zinc-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
            Réinitialiser
          </button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        id="drop-zone"
        className={`relative cursor-pointer border-2 border-dashed rounded-lg p-8 transition-all flex flex-col items-center justify-center text-center ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/5 scale-[0.99]'
            : 'border-zinc-800 bg-[#0A0A0B]/50 hover:bg-[#0A0A0B]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        {isParsing ? (
          <div className="flex flex-col items-center py-4">
            <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-zinc-300">Traitement et analyse des fichiers en cours...</p>
            <p className="text-xs text-zinc-500 mt-1">Fusion et déduplication des données...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-3 bg-emerald-500/5 rounded-full text-emerald-400 border border-emerald-500/10 mb-3 animate-pulse">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-zinc-300">
              <span className="text-emerald-400 font-semibold">Cliquer pour choisir</span> ou glisser des fichiers ici
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">
              Accepte les fichiers .xlsx, .xls et .csv (formats d'exports ECOTRACK)
            </p>
          </div>
        )}
      </div>

      {errorText && (
        <div className="mt-4 p-3 bg-red-950/20 border border-red-900/50 rounded-lg flex items-start gap-2 text-red-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorText}</span>
        </div>
      )}

      {summary && (
        <div id="import-summary" className="mt-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/5 rounded text-emerald-400 border border-emerald-500/10">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                Résumé d'importation
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                {summary.fileCount} fichier{summary.fileCount > 1 ? 's' : ''} • {summary.totalRows} ligne{summary.totalRows > 1 ? 's' : ''} uniques • {summary.ignoredDuplicates} doublon{summary.ignoredDuplicates > 1 ? 's' : ''} ignoré{summary.ignoredDuplicates > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold rounded border border-emerald-500/20 uppercase tracking-wider">
              Importation réussie
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
