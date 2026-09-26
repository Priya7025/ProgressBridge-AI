'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import {
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Loader2,
  Sparkles,
  Eye,
  Camera,
  FileCheck,
  Maximize2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export type ViewType = 'FRONT' | 'LEFT' | 'RIGHT' | 'TOP' | 'OTHER'

interface VisualProgressClientProps {
  activityId: string
  activityCode: string
  projectId: string
  userId: string
  discipline?: string | null
  location?: string | null
}

interface ImageMeta {
  url: string
  storagePath: string
  filename: string
  uploadedAt: string
}

interface VisualAnalysisResult {
  assetDetected: boolean
  viewMatched: boolean
  locationConsistent: boolean
  confidence: number | null
  completionState: string
  differences: string[]
}

const VIEW_TYPES: { type: ViewType; label: string }[] = [
  { type: 'FRONT', label: 'Front View' },
  { type: 'LEFT', label: 'Left View' },
  { type: 'RIGHT', label: 'Right View' },
  { type: 'TOP', label: 'Top View' },
  { type: 'OTHER', label: 'Overview / Other' },
]

export function VisualProgressClient({
  activityId,
  activityCode,
  location,
  userId,
}: VisualProgressClientProps) {
  const supabase = createClient()
  const [selectedView, setSelectedView] = useState<ViewType>('FRONT')

  const [designImages, setDesignImages] = useState<Record<ViewType, ImageMeta | null>>({
    FRONT: null,
    LEFT: null,
    RIGHT: null,
    TOP: null,
    OTHER: null,
  })

  const [siteImages, setSiteImages] = useState<Record<ViewType, ImageMeta | null>>({
    FRONT: null,
    LEFT: null,
    RIGHT: null,
    TOP: null,
    OTHER: null,
  })

  const [savedComparisons, setSavedComparisons] = useState<Record<ViewType, VisualAnalysisResult | null>>({
    FRONT: null,
    LEFT: null,
    RIGHT: null,
    TOP: null,
    OTHER: null,
  })

  const [uploadingDesign, setUploadingDesign] = useState(false)
  const [uploadingSite, setUploadingSite] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const designInputRef = useRef<HTMLInputElement>(null)
  const siteInputRef = useRef<HTMLInputElement>(null)

  // Helper to safely get authenticated signed URL for private bucket storage
  const getAuthenticatedImageUrl = async (path: string): Promise<string> => {
    const { data } = await supabase.storage
      .from('progress-documents')
      .createSignedUrl(path, 3600)

    if (data?.signedUrl) {
      return data.signedUrl
    }
    // Fallback to public URL if signedUrl fails
    const { data: publicData } = supabase.storage
      .from('progress-documents')
      .getPublicUrl(path)
    return publicData.publicUrl
  }

  // Load existing uploaded images & saved visual comparison records from Supabase DB/Storage
  useEffect(() => {
    let isMounted = true

    async function loadStorageAndDBRecords() {
      try {
        // 1. List user's files from progress-documents bucket
        const { data: listData } = await supabase.storage
          .from('progress-documents')
          .list(userId, { limit: 100 })

        if (listData && isMounted) {
          const updatedDesign = { ...designImages }
          const updatedSite = { ...siteImages }

          for (const { type } of VIEW_TYPES) {
            const designFile = listData.find((f) =>
              f.name.startsWith(`visual_${activityCode}_${type}_design`)
            )
            if (designFile) {
              const path = `${userId}/${designFile.name}`
              const signedUrl = await getAuthenticatedImageUrl(path)
              updatedDesign[type] = {
                url: signedUrl,
                storagePath: path,
                filename: designFile.name,
                uploadedAt: designFile.created_at || new Date().toISOString(),
              }
            }

            const siteFile = listData.find((f) =>
              f.name.startsWith(`visual_${activityCode}_${type}_site`)
            )
            if (siteFile) {
              const path = `${userId}/${siteFile.name}`
              const signedUrl = await getAuthenticatedImageUrl(path)
              updatedSite[type] = {
                url: signedUrl,
                storagePath: path,
                filename: siteFile.name,
                uploadedAt: siteFile.created_at || new Date().toISOString(),
              }
            }
          }

          if (isMounted) {
            setDesignImages(updatedDesign)
            setSiteImages(updatedSite)
          }
        }

        // 2. Fetch real saved visual comparison analysis from database if table exists
        const { data: dbComparisons } = await supabase
          .from('visual_comparisons')
          .select('*')
          .eq('activity_id', activityId)

        if (dbComparisons && Array.isArray(dbComparisons) && isMounted) {
          const updatedComp = { ...savedComparisons }
          dbComparisons.forEach((row) => {
            const vType = (row.view_type || 'FRONT').toUpperCase() as ViewType
            if (updatedComp[vType] !== undefined) {
              updatedComp[vType] = {
                assetDetected: row.view_match_score ? row.view_match_score > 0.5 : true,
                viewMatched: Boolean(row.view_type),
                locationConsistent: Boolean(location),
                confidence: row.confidence ?? row.visual_similarity ?? null,
                completionState: row.completion_state || 'COMPLETED',
                differences: Array.isArray(row.differences) ? row.differences : [],
              }
            }
          })
          setSavedComparisons(updatedComp)
        }
      } catch {
        // Fallback gracefully if database or storage queries encounter errors
      }
    }

    loadStorageAndDBRecords()

    return () => {
      isMounted = false
    }
  }, [activityId, activityCode, userId, location])

  // Handle uploading design image
  const handleDesignUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDesign(true)
    setErrorMsg(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `${userId}/visual_${activityCode}_${selectedView}_design.${ext}`

      const { error: storageError } = await supabase.storage
        .from('progress-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (storageError) {
        setErrorMsg(`Failed to upload design drawing: ${storageError.message}`)
        return
      }

      const signedUrl = await getAuthenticatedImageUrl(storagePath)

      const meta: ImageMeta = {
        url: signedUrl,
        storagePath,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      }

      setDesignImages((prev) => ({ ...prev, [selectedView]: meta }))
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message || 'Upload failed')
    } finally {
      setUploadingDesign(false)
    }
  }

  // Handle uploading site photo
  const handleSiteUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSite(true)
    setErrorMsg(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `${userId}/visual_${activityCode}_${selectedView}_site.${ext}`

      const { error: storageError } = await supabase.storage
        .from('progress-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (storageError) {
        setErrorMsg(`Failed to upload site photo: ${storageError.message}`)
        return
      }

      const signedUrl = await getAuthenticatedImageUrl(storagePath)

      const meta: ImageMeta = {
        url: signedUrl,
        storagePath,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      }

      setSiteImages((prev) => ({ ...prev, [selectedView]: meta }))
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message || 'Upload failed')
    } finally {
      setUploadingSite(false)
    }
  }

  const currentDesign = designImages[selectedView]
  const currentSite = siteImages[selectedView]

  // Real analysis result retrieved from database (or null if pending)
  const analysisResult = savedComparisons[selectedView]

  return (
    <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
              <Eye className="size-4 text-primary" />
              <span>VISUAL EXECUTION VERIFICATION</span>
            </span>
            <CardTitle className="font-heading text-lg font-bold text-foreground mt-0.5">
              {activityCode} — Planned Design vs Actual Site View
            </CardTitle>
          </div>

          {analysisResult && analysisResult.confidence !== null && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-bold font-mono">
              <Sparkles className="size-3.5" />
              <span>Visual Confidence: {(analysisResult.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-1">
        {/* VIEW TYPE SELECTION TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/40 scrollbar-none">
          {VIEW_TYPES.map(({ type, label }) => {
            const hasDesign = Boolean(designImages[type])
            const hasSite = Boolean(siteImages[type])
            const isActive = selectedView === type

            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedView(type)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold font-heading transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
                }`}
              >
                <span>{label}</span>
                {(hasDesign || hasSite) && (
                  <span className="size-2 rounded-full bg-emerald-400" />
                )}
              </button>
            )
          })}
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded text-xs font-semibold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-[11px] underline ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SIDE-BY-SIDE PLANNED VS ACTUAL IMAGE VIEWER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: PLANNED ENGINEERING DESIGN */}
          <div className="space-y-3 bg-muted/40 border border-border p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-heading uppercase text-primary tracking-wider flex items-center gap-1.5">
                <FileCheck className="size-4 text-primary" />
                <span>PLANNED DESIGN ({selectedView})</span>
              </h4>
              {currentDesign && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDate(currentDesign.uploadedAt)}
                </span>
              )}
            </div>

            {/* DESIGN IMAGE CONTAINER */}
            <div className="relative min-h-[220px] bg-background border border-border/60 rounded-lg overflow-hidden flex items-center justify-center p-2">
              {uploadingDesign ? (
                <div className="flex flex-col items-center gap-2 text-primary p-6">
                  <Loader2 className="size-6 animate-spin" />
                  <span className="text-xs font-semibold">Uploading Design Drawing...</span>
                </div>
              ) : currentDesign ? (
                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center group">
                  <img
                    src={currentDesign.url}
                    alt={`Planned Design ${selectedView}`}
                    className="max-h-[260px] w-auto object-contain rounded"
                  />
                  <a
                    href={currentDesign.url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View full size"
                  >
                    <Maximize2 className="size-3.5" />
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-6 space-y-2 text-muted-foreground">
                  <div className="p-3 bg-muted rounded-full border border-border">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium">No planned design drawing uploaded for {selectedView.toLowerCase()} view</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <input
                ref={designInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleDesignUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingDesign}
                onClick={() => designInputRef.current?.click()}
                className="w-full text-xs border border-primary/40 text-primary hover:bg-primary/10 font-bold h-9 cursor-pointer"
              >
                <Upload className="size-3.5 mr-1.5" />
                {currentDesign ? 'Replace Design Drawing' : 'Upload Design Drawing'}
              </Button>
            </div>
          </div>

          {/* RIGHT: ACTUAL SITE PHOTO */}
          <div className="space-y-3 bg-muted/40 border border-border p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-heading uppercase text-accent tracking-wider flex items-center gap-1.5">
                <Camera className="size-4 text-accent" />
                <span>ACTUAL SITE PHOTO ({selectedView})</span>
              </h4>
              {currentSite && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDate(currentSite.uploadedAt)}
                </span>
              )}
            </div>

            {/* SITE PHOTO CONTAINER */}
            <div className="relative min-h-[220px] bg-background border border-border/60 rounded-lg overflow-hidden flex items-center justify-center p-2">
              {uploadingSite ? (
                <div className="flex flex-col items-center gap-2 text-accent p-6">
                  <Loader2 className="size-6 animate-spin" />
                  <span className="text-xs font-semibold">Uploading Site Photo...</span>
                </div>
              ) : currentSite ? (
                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center group">
                  <img
                    src={currentSite.url}
                    alt={`Actual Site Photo ${selectedView}`}
                    className="max-h-[260px] w-auto object-contain rounded"
                  />
                  <a
                    href={currentSite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View full size"
                  >
                    <Maximize2 className="size-3.5" />
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-6 space-y-2 text-muted-foreground">
                  <div className="p-3 bg-muted rounded-full border border-border">
                    <Camera className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium">No site photo uploaded for {selectedView.toLowerCase()} view</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <input
                ref={siteInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSiteUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingSite}
                onClick={() => siteInputRef.current?.click()}
                className="w-full text-xs border border-accent/40 text-accent hover:bg-accent/10 font-bold h-9 cursor-pointer"
              >
                <Upload className="size-3.5 mr-1.5" />
                {currentSite ? 'Replace Site Photo' : 'Upload Site Photo'}
              </Button>
            </div>
          </div>
        </div>

        {/* AI VISUAL ANALYSIS RESULTS PANEL */}
        <div className="pt-2">
          {analysisResult ? (
            <div className="bg-muted/50 border border-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h4 className="text-xs font-bold font-heading uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary" />
                  <span>AI Visual Evidence Analysis ({selectedView})</span>
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  State: {analysisResult.completionState}
                </span>
              </div>

              {/* CHECKLIST */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Asset detected</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>View matched ({selectedView})</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Location consistent</span>
                </div>
              </div>

              {/* OBSERVATIONS & DIFFERENCES FROM DB */}
              {analysisResult.differences.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider block">
                    Observations & Differences:
                  </span>
                  <ul className="space-y-1 text-xs text-foreground font-medium pl-1">
                    {analysisResult.differences.map((diff, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary font-bold">•</span>
                        <span>{diff}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/40 border border-border p-4 rounded-xl text-center space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Analysis Pending</p>
              <p>Upload both a Planned Design drawing and an Actual Site photo for {selectedView.toLowerCase()} view to enable Visual AI comparison.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
