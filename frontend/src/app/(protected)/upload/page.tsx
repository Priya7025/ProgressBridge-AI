'use client'

/**
 * Authenticated Supabase Storage upload (`progress-documents` bucket)
 * and ingestion pipeline for schedules, daily reports, and project documents.
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
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/use-user'

type UploadStatus = 'READY' | 'PARSING' | 'UPLOADING' | 'INDEXING' | 'COMPLETE' | 'ERROR'

interface UploadResult {
  rows_read?: number
  rows_valid?: number
  rows_rejected?: number
  rows_upserted?: number
  duplicates?: number
  disciplines?: Record<string, number>
  indexing_status?: string
  message?: string
  error?: string
}

interface UploadFileItem {
  id: string
  file: File
  status: UploadStatus
  result?: UploadResult
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
    return <FileSpreadsheet className="size-5 text-primary" />
  }
  if (ext === 'pdf') {
    return <FileType className="size-5 text-destructive" />
  }
  return <FileText className="size-5 text-accent" />
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const currentUser = useCurrentUser()

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

  const executeRealUpload = async (id: string) => {
    const item = files.find((f) => f.id === id)
    if (!item) return

    const ext = item.file.name.split('.').pop()?.toLowerCase()

    // 1. Mark as uploading to Supabase Storage
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'UPLOADING' } : f))
    )

    try {
      // 2. Ensure user is authenticated before upload
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      const userId = user?.id || currentUser?.id

      if (authError || !userId) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'ERROR',
                  result: { error: 'Authentication required. Please sign in.' },
                }
              : f
          )
        )
        return
      }

      // 3. Real authenticated upload to Supabase Storage bucket `progress-documents`
      const storagePath = `${userId}/${item.file.name}`
      const { error: storageError } = await supabase.storage
        .from('progress-documents')
        .upload(storagePath, item.file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (storageError) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'ERROR',
                  result: {
                    error: `Storage upload failed: ${storageError.message}`,
                  },
                }
              : f
          )
        )
        return
      }

      // 4. Downstream processing by file type
      if (ext === 'csv' || ext === 'xlsx') {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'PARSING' } : f))
        )

        const formData = new FormData()
        formData.append('file', item.file)
        const activeProjectId = currentUser?.project_ids?.[0]
        if (activeProjectId) {
          formData.append('projectId', activeProjectId)
        }

        const res = await fetch('/api/upload/schedule', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'ERROR',
                    result: { error: data.error || 'Schedule upload failed' },
                  }
                : f
            )
          )
          return
        }

        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'INDEXING' } : f))
        )

        await new Promise((r) => setTimeout(r, 600))

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'COMPLETE',
                  result: {
                    rows_read: data.rows_read,
                    rows_valid: data.rows_valid,
                    rows_rejected: data.rows_rejected,
                    rows_upserted: data.rows_upserted,
                    duplicates: data.duplicates,
                    disciplines: data.disciplines,
                    indexing_status: data.indexing?.status || 'READY',
                    message:
                      data.indexing?.message ||
                      `Stored in progress-documents/${storagePath} and indexed ${data.rows_upserted || 0} activities.`,
                  },
                }
              : f
          )
        )
      } else if (ext === 'txt') {
        // Daily Report text file ingestion via existing /api/time-agent
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'PARSING' } : f))
        )

        const textContent = await item.file.text()
        const activeProjectId = currentUser?.project_ids?.[0]

        const res = await fetch('/api/time-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textContent,
            projectId: activeProjectId,
          }),
        })

        const data = await res.json()

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: res.ok && data.success ? 'COMPLETE' : 'ERROR',
                  result: {
                    message:
                      data.message ||
                      `Uploaded to Storage (progress-documents/${storagePath}) & processed by AI extraction pipeline`,
                    error: !res.ok ? data.message || 'Extraction failed' : undefined,
                  },
                }
              : f
          )
        )
      } else if (ext === 'pdf') {
        // PDF format: real Storage upload succeeded
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'COMPLETE',
                  result: {
                    message: `Uploaded to Supabase Storage: progress-documents/${storagePath}. Ready for AI document extraction.`,
                  },
                }
              : f
          )
        )
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'COMPLETE',
                  result: {
                    message: `Uploaded to Supabase Storage: progress-documents/${storagePath}`,
                  },
                }
              : f
          )
        )
      }
    } catch (err: unknown) {
      const error = err as Error
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'ERROR',
                result: { error: error.message || 'Network error' },
              }
            : f
        )
  const handleUploadAll = async () => {
    setFileError(null)
    setSuccessMessage(null)
    setIsUploading(true)

    const readyFiles = files.filter((f) => f.status === 'READY')
    for (const fileItem of readyFiles) {
      await executeRealUpload(fileItem.id)
    }
    setIsUploading(false)
  }

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-muted text-foreground border border-border/60 rounded">
            Ready to upload
          </span>
        )
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-primary/20 text-primary border border-primary/40 rounded animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Uploading to Storage...
          </span>
        )
      case 'PARSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-accent/15 text-accent border border-accent/40 rounded animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Uploading...
          </span>
        )
      case 'INDEXING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-primary/30 text-primary border border-primary/50 rounded animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Indexing...
          </span>
        )
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-700/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 rounded">
            <CheckCircle2 className="size-3" />
            Complete
          </span>
        )
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-destructive/20 text-destructive border border-destructive/50 rounded">
            Upload Failed
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full transition-colors duration-200">
      {/* PAGE HEADER */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-heading font-sans text-primary">
          Upload Schedule / Progress Report
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
          Upload baseline activity schedules or daily progress reports. Accepted file formats: <strong className="text-primary font-mono">.xlsx, .csv, .txt, .pdf</strong>
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
      <Card className="bg-card border-2 border-dashed border-primary/60 hover:border-primary transition-all rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 cursor-pointer transition-all rounded-xl ${
              isDragging ? 'bg-muted/80 border-primary' : 'hover:bg-muted/40'
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
            <div className="size-12 sm:size-16 rounded-full bg-muted border border-primary/40 flex items-center justify-center mb-3 sm:mb-4 shadow-[rgba(226,191,41,0.15)_0px_0px_16px]">
              <Upload className="size-6 sm:size-8 text-primary" />
            </div>
            <p className="text-sm sm:text-base font-bold font-heading text-foreground text-center">
              Drag files here or <span className="text-primary underline">click to browse</span>
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 text-center font-sans">
              Supports Microsoft Excel (.xlsx), CSV (.csv), Plain Text (.txt), and PDF (.pdf)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FILE LIST AND ACTIONS */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold font-heading uppercase tracking-wider text-primary">
              Selected Files ({files.length})
            </h3>
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || !files.some((f) => f.status === 'READY')}
              className="bg-primary text-primary-foreground font-bold rounded-lg shadow-[rgba(226,191,41,0.3)_0px_0px_12px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer text-xs sm:text-sm py-1.5 px-3 sm:px-4"
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
                className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"
              >
                <CardContent className="p-3 sm:p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 p-2 bg-muted border border-border/50 rounded-lg">
                        {getFileIcon(item.file.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold font-sans text-foreground truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {getStatusBadge(item.status)}

                      <div className="flex items-center gap-2">
                        {item.status === 'READY' && (
                          <Button
                            size="sm"
                            disabled={isUploading}
                            onClick={() => executeRealUpload(item.id)}
                            className="bg-primary text-primary-foreground font-bold text-xs rounded hover:opacity-90 transition-colors cursor-pointer h-7 sm:h-8 px-2.5 sm:px-3"
                          >
                            Upload
                          </Button>
                        )}

                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removeFile(item.id)}
                          disabled={isUploading || item.status === 'PARSING' || item.status === 'UPLOADING' || item.status === 'INDEXING'}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer size-7 sm:size-8"
                          title="Remove file"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* REAL UPLOAD SUMMARY METRICS */}
                  {item.result && (
                    <div className="mt-1 pt-2.5 border-t border-border/40 text-xs space-y-2">
                      {item.result.error ? (
                        <p className="text-destructive font-semibold">
                          Error: {item.result.error}
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
                            {item.result.rows_upserted !== undefined && (
                              <span>
                                Uploaded:{' '}
                                <strong className="text-foreground font-mono font-bold">
                                  {item.result.rows_upserted}
                                </strong>
                              </span>
                            )}
                            {item.result.rows_rejected !== undefined && (
                              <span>
                                Rejected:{' '}
                                <strong className="text-foreground font-mono font-bold">
                                  {item.result.rows_rejected}
                                </strong>
                              </span>
                            )}
                            {item.result.duplicates !== undefined && item.result.duplicates > 0 && (
                              <span>
                                Duplicate keys:{' '}
                                <strong className="text-primary font-mono font-bold">
                                  {item.result.duplicates}
                                </strong>
                              </span>
                            )}
                            {item.result.indexing_status && (
                              <span>
                                Indexing:{' '}
                                <strong className="text-primary font-mono font-bold">
                                  {item.result.indexing_status}
                                </strong>
                              </span>
                            )}
                          </div>

                          {item.result.disciplines && Object.keys(item.result.disciplines).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {Object.entries(item.result.disciplines).map(([disc, cnt]) => (
                                <span
                                  key={disc}
                                  className="text-[10px] font-bold font-heading uppercase px-2 py-0.5 rounded bg-muted border border-primary/30 text-primary"
                                >
                                  {disc}: {cnt}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.result.message && (
                            <p className="text-[11px] text-muted-foreground italic">
                              {item.result.message}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

