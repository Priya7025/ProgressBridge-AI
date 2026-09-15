'use client'

/**
 * TODO: Wire up real Supabase Storage bucket upload and progress events ingestion pipeline
 * once the Supabase storage bucket name (e.g. `documents` or `schedule-uploads`) is confirmed.
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  FileType,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type UploadStatus = 'READY' | 'PARSING' | 'EXTRACTING' | 'MATCHING' | 'COMPLETE'

interface UploadFileItem {
  id: string
  file: File
  status: UploadStatus
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'csv') {
    return <FileSpreadsheet className="size-5 text-[#e2bf29]" />
  }
  if (ext === 'pdf') {
    return <FileType className="size-5 text-[#b71511]" />
  }
  return <FileText className="size-5 text-[#337ab7]" />
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedExtensions = ['xlsx', 'csv', 'txt', 'pdf']

  const handleFiles = (incomingFiles: File[]) => {
    setFileError(null)
    setSuccessMessage(null)

    const invalidFiles = incomingFiles.filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return !ext || !allowedExtensions.includes(ext)
    })

    if (invalidFiles.length > 0) {
      setFileError(
        `Unsupported file type (${invalidFiles.map((f) => f.name).join(', ')}). Only .xlsx, .csv, .txt, and .pdf files are allowed.`
      )
    }

    const validFiles = incomingFiles.filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ext && allowedExtensions.includes(ext)
    })

    if (validFiles.length === 0) return

    const newItems: UploadFileItem[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      status: 'READY',
    }))

    setFiles((prev) => [...prev, ...newItems])
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id))
  }

  const uploadItem = async (item: UploadFileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'PARSING' } : f))
    )

    try {
      const formData = new FormData()
      formData.append('file', item.file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed.')
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'COMPLETE' } : f))
      )
      return { success: true, name: item.file.name }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'READY' } : f))
      )
      return { success: false, name: item.file.name, error: msg }
    }
  }

  const handleUploadSingle = async (item: UploadFileItem) => {
    setFileError(null)
    setSuccessMessage(null)
    setIsUploading(true)

    const res = await uploadItem(item)
    setIsUploading(false)

    if (res.success) {
      setSuccessMessage(`Successfully uploaded ${res.name}.`)
    } else {
      setFileError(`Failed to upload ${res.name}: ${res.error}`)
    }
  }

  const handleUploadAll = async () => {
    setFileError(null)
    setSuccessMessage(null)
    setIsUploading(true)

    const readyFiles = files.filter((f) => f.status === 'READY')
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const item of readyFiles) {
      const res = await uploadItem(item)
      if (res.success) {
        successCount++
      } else {
        failCount++
        errors.push(`${res.name}: ${res.error}`)
      }
    }

    setIsUploading(false)

    if (successCount > 0 && failCount === 0) {
      setSuccessMessage(`Successfully uploaded ${successCount} file(s).`)
    } else if (failCount > 0) {
      setFileError(
        `Failed to upload ${failCount} file(s). ${errors.join('; ')}`
      )
    }
  }

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#1a1a1a] text-[#f1f2f3] border border-zinc-700 rounded">
            Ready to upload
          </span>
        )
      case 'PARSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#337ab7]/20 text-[#337ab7] border border-[#337ab7]/40 rounded animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Uploading...
          </span>
        )
      case 'EXTRACTING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#e2bf29]/20 text-[#e2bf29] border border-[#e2bf29]/40 rounded animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Extracting...
          </span>
        )
      case 'MATCHING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#e2bf29]/30 text-[#e2bf29] border border-[#e2bf29]/50 rounded animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Matching...
          </span>
        )
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 rounded">
            <CheckCircle2 className="size-3" />
            Complete
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-8 bg-[#000000] min-h-full">
      {/* PAGE HEADER */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-heading font-sans font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#e2bf29]">
          Upload Schedule / Progress Report
        </h2>
        <p className="text-sm text-[#f1f2f3]/80 font-sans mt-1">
          Upload construction schedules or daily progress reports. Accepted file formats: <strong className="text-[#e2bf29] font-mono">.xlsx, .csv, .txt, .pdf</strong>
        </p>
      </div>

      {fileError && (
        <div className="bg-[#111111] text-[#b71511] border border-[#b71511]/50 p-4 rounded-lg text-sm font-semibold shadow-sm flex items-center justify-between">
          <span>{fileError}</span>
          <button
            type="button"
            onClick={() => setFileError(null)}
            className="text-xs text-[#f1f2f3]/60 hover:text-white underline cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-[#111111] text-emerald-400 border border-emerald-500/50 p-4 rounded-lg text-sm font-semibold shadow-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-[#f1f2f3]/60 hover:text-white underline cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* DRAG AND DROP ZONE */}
      <Card className="bg-[#070707] border-2 border-dashed border-[#e2bf29]/60 hover:border-[#e2bf29] transition-all rounded-lg shadow-sm">
        <CardContent className="p-0">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center py-12 px-6 cursor-pointer transition-all ${
              isDragging ? 'bg-[#111111] border-[#e2bf29]' : 'hover:bg-[#111111]/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.csv,.txt,.pdf"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="size-16 rounded-full bg-[#111111] border border-[#e2bf29]/40 flex items-center justify-center mb-4 shadow-[rgba(226,191,41,0.15)_0px_0px_16px]">
              <Upload className="size-8 text-[#e2bf29]" />
            </div>
            <p className="text-base font-bold font-heading text-[#ffffff] text-center">
              Drag files here or <span className="text-[#e2bf29] underline">click to browse</span>
            </p>
            <p className="text-xs text-[#f1f2f3]/60 mt-1 text-center font-sans">
              Supports Microsoft Excel (.xlsx), CSV (.csv), Plain Text (.txt), and PDF (.pdf)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FILE LIST AND ACTIONS */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-[#e2bf29]">
              Selected Files ({files.length})
            </h3>
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || !files.some((f) => f.status === 'READY')}
              className="bg-[#e2bf29] text-[#111111] font-bold rounded shadow-[rgba(226,191,41,0.3)_0px_0px_12px] hover:bg-[#c9a720] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" />
                  Uploading...
                </>
              ) : (
                'Upload All'
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {files.map((item) => (
              <Card
                key={item.id}
                className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/40 rounded-lg shadow-sm"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 p-2 bg-[#070707] border border-[#e2bf29]/20 rounded">
                      {getFileIcon(item.file.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-sans text-[#ffffff] truncate">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-[#f1f2f3]/60 font-mono">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                    {getStatusBadge(item.status)}

                    {item.status === 'READY' && (
                      <Button
                        size="sm"
                        disabled={isUploading}
                        onClick={() => handleUploadSingle(item)}
                        className="bg-[#e2bf29] text-[#111111] font-bold text-xs rounded hover:bg-[#c9a720] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Upload
                      </Button>
                    )}

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeFile(item.id)}
                      disabled={isUploading || (item.status !== 'READY' && item.status !== 'COMPLETE')}
                      className="text-[#f1f2f3]/70 hover:text-[#b71511] hover:bg-[#b71511]/10 rounded cursor-pointer"
                      title="Remove file"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

