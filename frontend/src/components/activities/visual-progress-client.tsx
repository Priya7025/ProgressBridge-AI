'use client'

import { useState, useEffect, useRef, ChangeEvent, useCallback } from 'react'
import {
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  Eye,
  Camera,
  FileCheck,
  Maximize2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/use-user'

export type ViewType = 'FRONT' | 'LEFT' | 'RIGHT' | 'TOP' | 'OTHER'

interface VisualProgressClientProps {
  activityId: string
  activityCode: string
  projectId?: string
  userId: string
  userRole?: string | null
  discipline?: string | null
  location?: string | null
}

interface ImageMeta {
  id?: string
  url: string
  storagePath: string
  filename: string
  uploadedAt: string
  viewType: ViewType
}

interface VisualAnalysisResult {
  id?: string
  assetDetected: boolean
  viewMatched: boolean
  locationConsistent: boolean
  confidence: number | null
  visualSimilarity: number | null
  viewMatchScore: number | null
  completionState: string
  differences: string[]
  status: 'PENDING_REVIEW' | 'VERIFIED' | 'FLAGGED' | 'REJECTED' | string
  hasValidComparison: boolean
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
  projectId,
  location,
  userId,
  userRole,
}: VisualProgressClientProps) {
  const supabase = createClient()
  const currentUser = useCurrentUser()
  const [selectedView, setSelectedView] = useState<ViewType>('FRONT')

  // Determine user role with fallback
  const effectiveRole = (userRole || currentUser?.role || 'planner').toLowerCase()
  const isPlanner = effectiveRole === 'planner'
  const isSupervisor = effectiveRole === 'supervisor'

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
  const [isComparing, setIsComparing] = useState(false)
  const [reviewingStatus, setReviewingStatus] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const designInputRef = useRef<HTMLInputElement>(null)
  const siteInputRef = useRef<HTMLInputElement>(null)

  // Helper to safely get authenticated signed or public URL
  const getAuthenticatedImageUrl = useCallback(
    async (path: string): Promise<string> => {
      if (!path) return ''
      if (path.startsWith('http://') || path.startsWith('https://')) return path

      try {
        const { data: publicData } = supabase.storage
          .from('visual-evidence')
          .getPublicUrl(path)
        if (publicData?.publicUrl) return publicData.publicUrl

        const { data: signedData } = await supabase.storage
          .from('progress-documents')
          .createSignedUrl(path, 3600)
        if (signedData?.signedUrl) return signedData.signedUrl

        const { data: fallbackData } = supabase.storage
          .from('progress-documents')
          .getPublicUrl(path)
        return fallbackData.publicUrl
      } catch {
        return ''
      }
    },
    [supabase]
  )

  // Fetch real visual evidence from DB & Storage
  const fetchEvidenceData = useCallback(async () => {
    try {
      const res = await fetch(`/api/visual/evidence?activity_id=${encodeURIComponent(activityId)}`)
      let evidenceData = null

      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          evidenceData = json.data
        }
      }

      const updatedDesign: Record<ViewType, ImageMeta | null> = {
        FRONT: null,
        LEFT: null,
        RIGHT: null,
        TOP: null,
        OTHER: null,
      }
      const updatedSite: Record<ViewType, ImageMeta | null> = {
        FRONT: null,
        LEFT: null,
        RIGHT: null,
        TOP: null,
        OTHER: null,
      }
      const updatedComp: Record<ViewType, VisualAnalysisResult | null> = {
        FRONT: null,
        LEFT: null,
        RIGHT: null,
        TOP: null,
        OTHER: null,
      }

      if (evidenceData) {
        // Map design images from database
        if (Array.isArray(evidenceData.design_images)) {
          for (const img of evidenceData.design_images) {
            const vType = (img.view_type || 'OTHER').toUpperCase() as ViewType
            if (updatedDesign[vType] !== undefined && !updatedDesign[vType]) {
              const url = img.public_url || (await getAuthenticatedImageUrl(img.storage_path))
              updatedDesign[vType] = {
                id: img.id,
                url,
                storagePath: img.storage_path,
                filename: img.file_name || 'design.jpg',
                uploadedAt: img.created_at || new Date().toISOString(),
                viewType: vType,
              }
            }
          }
        }

        // Map site images from database
        if (Array.isArray(evidenceData.site_images)) {
          for (const img of evidenceData.site_images) {
            const vType = (img.view_type || 'OTHER').toUpperCase() as ViewType
            if (updatedSite[vType] !== undefined && !updatedSite[vType]) {
              const url = img.public_url || (await getAuthenticatedImageUrl(img.storage_path))
              updatedSite[vType] = {
                id: img.id,
                url,
                storagePath: img.storage_path,
                filename: img.file_name || 'site.jpg',
                uploadedAt: img.created_at || new Date().toISOString(),
                viewType: vType,
              }
            }
          }
        }

        // Map visual comparisons from database
        if (Array.isArray(evidenceData.comparisons)) {
          for (const comp of evidenceData.comparisons) {
            const vType = (
              comp.design_image?.view_type ||
              comp.site_image?.view_type ||
              'FRONT'
            ).toUpperCase() as ViewType

            if (updatedComp[vType] !== undefined && !updatedComp[vType]) {
              const rawConfidence =
                comp.confidence !== null && comp.confidence !== undefined
                  ? Number(comp.confidence)
                  : null
              const rawSimilarity =
                comp.visual_similarity !== null && comp.visual_similarity !== undefined
                  ? Number(comp.visual_similarity)
                  : null
              const rawViewMatch =
                comp.view_match_score !== null && comp.view_match_score !== undefined
                  ? Number(comp.view_match_score)
                  : null
              const state = comp.completion_state || null
              const diffs = Array.isArray(comp.differences) ? comp.differences : []

              const hasValid = Boolean(
                (rawConfidence !== null && rawConfidence > 0) ||
                (rawSimilarity !== null && rawSimilarity !== undefined)
              )

              if (hasValid) {
                const hasMismatchDiff = diffs.some((d: string) =>
                  /mismatch|diverge|unrelated|unmatched|not match/i.test(d)
                )

                const assetDetected = Boolean(
                  comp.status === 'VERIFIED' ||
                  (rawSimilarity !== null && rawSimilarity >= 0.5 && !hasMismatchDiff)
                )

                const viewMatched = Boolean(
                  (rawViewMatch !== null && rawViewMatch >= 0.7) || comp.status === 'VERIFIED'
                )

                const locConsistent = Boolean(
                  Boolean(location) &&
                  ((rawSimilarity !== null && rawSimilarity >= 0.5) || comp.status === 'VERIFIED')
                )

                updatedComp[vType] = {
                  id: comp.id,
                  assetDetected,
                  viewMatched,
                  locationConsistent: locConsistent,
                  confidence: rawConfidence,
                  visualSimilarity: rawSimilarity,
                  viewMatchScore: rawViewMatch,
                  completionState: state || (assetDetected ? 'IN_PROGRESS' : 'UNKNOWN'),
                  differences: diffs,
                  status: comp.status || 'PENDING_REVIEW',
                  hasValidComparison: true,
                }
              } else {
                updatedComp[vType] = {
                  id: comp.id,
                  assetDetected: false,
                  viewMatched: false,
                  locationConsistent: false,
                  confidence: null,
                  visualSimilarity: null,
                  viewMatchScore: null,
                  completionState: 'Awaiting AI comparison',
                  differences: [],
                  status: comp.status || 'PENDING_REVIEW',
                  hasValidComparison: false,
                }
              }
            }
          }
        }
      }

      // Supplementary check: list files from progress-documents bucket
      try {
        const { data: listData } = await supabase.storage
          .from('progress-documents')
          .list(userId, { limit: 100 })

        if (listData) {
          for (const { type } of VIEW_TYPES) {
            if (!updatedDesign[type]) {
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
                  viewType: type,
                }
              }
            }

            if (!updatedSite[type]) {
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
                  viewType: type,
                }
              }
            }
          }
        }
      } catch {
        // ignore storage list errors
      }

      return { updatedDesign, updatedSite, updatedComp }
    } catch {
      return null
    }
  }, [activityId, activityCode, userId, location, getAuthenticatedImageUrl, supabase])

  useEffect(() => {
    let isMounted = true

    fetchEvidenceData().then((result) => {
      if (isMounted && result) {
        setDesignImages(result.updatedDesign)
        setSiteImages(result.updatedSite)
        setSavedComparisons(result.updatedComp)
      }
    })

    return () => {
      isMounted = false
    }
  }, [fetchEvidenceData])

  const refreshEvidence = async () => {
    const result = await fetchEvidenceData()
    if (result) {
      setDesignImages(result.updatedDesign)
      setSiteImages(result.updatedSite)
      setSavedComparisons(result.updatedComp)
    }
  }

  // Handle uploading design image via POST /api/visual/design-images (Planner only)
  const handleDesignUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDesign(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('activity_id', activityId)
      formData.append('view_type', selectedView)
      if (projectId) formData.append('project_id', projectId)

      const res = await fetch('/api/visual/design-images', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to upload design drawing')
      }

      await refreshEvidence()
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message || 'Upload failed')
    } finally {
      setUploadingDesign(false)
      if (designInputRef.current) designInputRef.current.value = ''
    }
  }

  // Handle uploading site photo via POST /api/visual/site-images (Supervisor only)
  const handleSiteUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSite(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('activity_id', activityId)
      formData.append('view_type', selectedView)
      if (projectId) formData.append('project_id', projectId)

      const res = await fetch('/api/visual/site-images', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to upload site photo')
      }

      await refreshEvidence()
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message || 'Upload failed')
    } finally {
      setUploadingSite(false)
      if (siteInputRef.current) siteInputRef.current.value = ''
    }
  }

  // Handle manual trigger or retry of AI visual comparison
  const handleTriggerAiComparison = async () => {
    const currentD = designImages[selectedView]
    const currentS = siteImages[selectedView]
    if (!currentD?.id || !currentS?.id) {
      setErrorMsg('Both design drawing and site photo are required to trigger AI comparison.')
      return
    }

    setIsComparing(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/visual/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_image_id: currentD.id,
          site_image_id: currentS.id,
          activity_id: activityId,
          project_id: projectId,
          trigger_ai: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'AI visual comparison execution failed')
      }

      await refreshEvidence()
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message || 'Failed to execute AI visual comparison')
    } finally {
      setIsComparing(false)
    }
  }

  // Handle planner review status update (VERIFIED / FLAGGED / REJECTED)
  const handleReviewAction = async (newStatus: 'VERIFIED' | 'FLAGGED' | 'REJECTED') => {
    const comp = savedComparisons[selectedView]
    if (!comp?.id) {
      setErrorMsg('No visual comparison record available to review.')
      return
    }

    setReviewingStatus(newStatus)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/visual/comparisons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: comp.id,
          status: newStatus,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to set review status to ${newStatus}`)
      }

      await refreshEvidence()
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message || 'Failed to update review status')
    } finally {
      setReviewingStatus(null)
    }
  }

  const currentDesign = designImages[selectedView]
  const currentSite = siteImages[selectedView]
  const analysisResult = savedComparisons[selectedView]

  const bothUploaded = Boolean(currentDesign && currentSite)
  const isAnalyzed = Boolean(analysisResult && analysisResult.hasValidComparison)

  return (
    <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Eye className="size-4 text-primary" />
                <span>VISUAL EXECUTION VERIFICATION</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                Role: {isSupervisor ? 'Supervisor' : 'Planner'}
              </span>
            </div>
            <CardTitle className="font-heading text-lg font-bold text-foreground mt-0.5">
              {activityCode} — Planned Design vs Actual Site View
            </CardTitle>
          </div>

          {isAnalyzed && analysisResult?.confidence !== null && analysisResult?.confidence !== undefined && (
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
                  <p className="text-xs font-medium">
                    {isPlanner
                      ? `No planned design drawing uploaded for ${selectedView.toLowerCase()} view`
                      : `No planned design drawing uploaded yet by planner`}
                  </p>
                </div>
              )}
            </div>

            {/* DESIGN CONTROLS: Planners can Upload/Replace; Supervisors see Read-Only */}
            <div className="pt-2">
              {isPlanner ? (
                <>
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
                </>
              ) : (
                <div className="h-9 flex items-center justify-center bg-muted/60 border border-border/40 rounded text-[11px] text-muted-foreground font-medium">
                  <span>Planned Design Drawing (Managed by Planner)</span>
                </div>
              )}
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
                  <p className="text-xs font-medium">
                    {isSupervisor
                      ? `No site photo uploaded for ${selectedView.toLowerCase()} view`
                      : `No site photo uploaded yet by supervisor`}
                  </p>
                </div>
              )}
            </div>

            {/* SITE CONTROLS: Supervisors can Upload/Replace; Planners see Read-Only */}
            <div className="pt-2">
              {isSupervisor ? (
                <>
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
                </>
              ) : (
                <div className="h-9 flex items-center justify-center bg-muted/60 border border-border/40 rounded text-[11px] text-muted-foreground font-medium">
                  <span>Actual Site Execution Photo (Managed by Supervisor)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI VISUAL ANALYSIS RESULTS PANEL */}
        <div className="pt-2">
          {!bothUploaded ? (
            <div className="bg-muted/40 border border-border p-4 rounded-xl text-center space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Analysis Pending</p>
              <p>Upload both a Planned Design drawing and an Actual Site photo for {selectedView.toLowerCase()} view to enable Visual AI comparison.</p>
            </div>
          ) : !isAnalyzed ? (
            <div className="bg-muted/50 border border-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h4 className="text-xs font-bold font-heading uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary" />
                  <span>AI Visual Evidence Analysis ({selectedView})</span>
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    State: Awaiting AI comparison
                  </span>
                </div>
              </div>

              {/* NEUTRAL / PENDING CHECKLIST */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 p-2 rounded border border-border font-medium">
                  <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>Asset pending verification</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 p-2 rounded border border-border font-medium">
                  <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>View match pending ({selectedView})</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 p-2 rounded border border-border font-medium">
                  <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>Location pending verification</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-muted-foreground italic">
                  Both planned design drawing and site photo are available. Ready for AI visual execution verification.
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isComparing}
                  onClick={handleTriggerAiComparison}
                  className="bg-primary text-primary-foreground text-xs font-bold h-8 px-3 shrink-0 cursor-pointer shadow-sm"
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 mr-1.5" />
                      Run AI Verification
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border border-border p-4 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold font-heading uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    <span>AI Visual Evidence Analysis ({selectedView})</span>
                  </h4>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                      analysisResult?.status === 'VERIFIED'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                        : analysisResult?.status === 'FLAGGED'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                        : analysisResult?.status === 'REJECTED'
                        ? 'bg-destructive/15 text-destructive border-destructive/40'
                        : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40'
                    }`}
                  >
                    Status: {(analysisResult?.status || 'PENDING_REVIEW').replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold ${
                      analysisResult?.completionState === 'COMPLETED' ||
                      analysisResult?.completionState === 'NEAR_COMPLETE'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : analysisResult?.completionState === 'IN_PROGRESS'
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    State: {analysisResult?.completionState}
                  </span>
                </div>
              </div>

              {/* KEY METRICS SUMMARY */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {analysisResult?.confidence !== null && analysisResult?.confidence !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-mono font-bold">
                    AI Confidence: {(analysisResult.confidence * 100).toFixed(0)}%
                  </span>
                )}
                {analysisResult?.visualSimilarity !== null && analysisResult?.visualSimilarity !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${
                      analysisResult.visualSimilarity >= 0.5
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    Visual Similarity: {(analysisResult.visualSimilarity * 100).toFixed(0)}%
                    {analysisResult.visualSimilarity < 0.5 && ' (Mismatch)'}
                  </span>
                )}
                {analysisResult?.viewMatchScore !== null && analysisResult?.viewMatchScore !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${
                      analysisResult.viewMatchScore >= 0.7
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                  >
                    View Match: {(analysisResult.viewMatchScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* EVIDENCE CHECKLIST */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div
                  className={`flex items-center gap-1.5 p-2 rounded border ${
                    analysisResult?.assetDetected
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-semibold'
                      : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20 font-semibold'
                  }`}
                >
                  {analysisResult?.assetDetected ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{analysisResult?.assetDetected ? 'Asset detected' : 'Asset mismatch / undetected'}</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 p-2 rounded border ${
                    analysisResult?.viewMatched
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-semibold'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 font-semibold'
                  }`}
                >
                  {analysisResult?.viewMatched ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>
                    {analysisResult?.viewMatched
                      ? `View matched (${selectedView})`
                      : `View unmatched (${selectedView})`}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 p-2 rounded border ${
                    analysisResult?.locationConsistent
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-semibold'
                      : 'text-muted-foreground bg-muted/60 border-border font-medium'
                  }`}
                >
                  {analysisResult?.locationConsistent ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-muted-foreground/60" />
                  )}
                  <span>
                    {analysisResult?.locationConsistent
                      ? 'Location consistent'
                      : 'Location unverified'}
                  </span>
                </div>
              </div>

              {/* OBSERVATIONS & DIFFERENCES FROM DB */}
              {analysisResult?.differences && analysisResult.differences.length > 0 && (
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

              {/* PLANNER REVIEW ACTIONS (Verify / Flag / Reject) */}
              <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isPlanner ? (
                    <span className="text-xs text-muted-foreground font-medium">
                      Planner Review Actions:
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" />
                      Visual evidence verified by Planner review.
                    </span>
                  )}
                </div>

                {isPlanner && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(reviewingStatus)}
                      onClick={() => handleReviewAction('VERIFIED')}
                      className={`text-xs font-bold h-8 px-3 border cursor-pointer ${
                        analysisResult?.status === 'VERIFIED'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                      }`}
                    >
                      {reviewingStatus === 'VERIFIED' ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      ) : (
                        <CheckCircle2 className="size-3.5 mr-1.5" />
                      )}
                      Verify Evidence
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(reviewingStatus)}
                      onClick={() => handleReviewAction('FLAGGED')}
                      className={`text-xs font-bold h-8 px-3 border cursor-pointer ${
                        analysisResult?.status === 'FLAGGED'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10'
                      }`}
                    >
                      {reviewingStatus === 'FLAGGED' ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      ) : (
                        <AlertTriangle className="size-3.5 mr-1.5" />
                      )}
                      Flag Issue
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(reviewingStatus)}
                      onClick={() => handleReviewAction('REJECTED')}
                      className={`text-xs font-bold h-8 px-3 border cursor-pointer ${
                        analysisResult?.status === 'REJECTED'
                          ? 'bg-destructive text-destructive-foreground border-destructive'
                          : 'text-destructive border-destructive/40 hover:bg-destructive/10'
                      }`}
                    >
                      {reviewingStatus === 'REJECTED' ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      ) : (
                        <XCircle className="size-3.5 mr-1.5" />
                      )}
                      Reject
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isComparing}
                      onClick={handleTriggerAiComparison}
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 cursor-pointer"
                      title="Re-run AI Analysis"
                    >
                      <RefreshCw className={`size-3.5 ${isComparing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                )}
              </div>
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
