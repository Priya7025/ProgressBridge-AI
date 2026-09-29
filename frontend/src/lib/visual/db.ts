import { SupabaseClient } from '@supabase/supabase-js'
import type {
  ActivityVisualEvidenceSummary,
  CompletionState,
  CreateVisualComparisonInput,
  DesignImage,
  ImageViewType,
  RegisterDesignImageInput,
  RegisterSiteImageInput,
  SiteImage,
  UpdateVisualComparisonReviewInput,
  VisualComparison,
  VisualComparisonStatus,
} from './types'

const VALID_VIEW_TYPES: ImageViewType[] = [
  'FRONT',
  'LEFT',
  'RIGHT',
  'TOP',
  'ISOMETRIC',
  'PERSPECTIVE',
  'SECTION',
  'OTHER',
]

const VALID_COMPLETION_STATES: CompletionState[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'NEAR_COMPLETE',
  'COMPLETED',
  'BLOCKED',
  'UNKNOWN',
]

const VALID_COMPARISON_STATUSES: VisualComparisonStatus[] = [
  'PENDING_REVIEW',
  'VERIFIED',
  'FLAGGED',
  'REJECTED',
]

/**
 * Normalizes input view type string into a valid ImageViewType.
 */
export function normalizeViewType(
  rawViewType?: string | null,
  fallback: ImageViewType = 'OTHER'
): ImageViewType {
  if (!rawViewType) return fallback
  const upper = rawViewType.trim().toUpperCase() as ImageViewType
  if (VALID_VIEW_TYPES.includes(upper)) {
    return upper
  }
  return fallback
}

/**
 * Normalizes completion state string.
 */
export function normalizeCompletionState(
  rawState?: string | null,
  fallback: CompletionState = 'UNKNOWN'
): CompletionState {
  if (!rawState) return fallback
  const upper = rawState.trim().toUpperCase() as CompletionState
  if (VALID_COMPLETION_STATES.includes(upper)) {
    return upper
  }
  return fallback
}

/**
 * Normalizes comparison review status string.
 */
export function normalizeComparisonStatus(
  rawStatus?: string | null,
  fallback: VisualComparisonStatus = 'PENDING_REVIEW'
): VisualComparisonStatus {
  if (!rawStatus) return fallback
  const upper = rawStatus.trim().toUpperCase() as VisualComparisonStatus
  if (VALID_COMPARISON_STATUSES.includes(upper)) {
    return upper
  }
  return fallback
}

/**
 * Generates the public image URL from the `visual-evidence` Supabase storage bucket.
 */
export function getPublicImageUrl(supabase: SupabaseClient, storagePath: string): string {
  if (!storagePath) return ''
  // If it's already an absolute HTTP(S) URL, return it directly
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }
  const { data } = supabase.storage.from('visual-evidence').getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Resolves an activity identifier (which could be a UUID or an activity_id code like 'PIP-2458').
 */
export async function resolveActivity(
  supabase: SupabaseClient,
  activityIdentifier: string,
  projectId?: string
): Promise<{ id: string; project_id: string; activity_id: string; description: string; discipline: string | null; location: string | null; asset: string | null } | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    activityIdentifier
  )

  let query = supabase
    .from('schedule_activities')
    .select('id, project_id, activity_id, description, discipline, location, asset')

  if (isUuid) {
    query = query.eq('id', activityIdentifier)
  } else {
    query = query.eq('activity_id', activityIdentifier)
  }

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Fetches all planner-uploaded design images for an activity.
 */
export async function getDesignImagesByActivity(
  supabase: SupabaseClient,
  activityId: string
): Promise<DesignImage[]> {
  const { data, error } = await supabase
    .from('design_images')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Visual DB] Error fetching design images:', error.message)
    return []
  }

  const rows = (data as DesignImage[]) || []
  return rows.map((img) => ({
    ...img,
    public_url: getPublicImageUrl(supabase, img.storage_path),
  }))
}

/**
 * Registers/Inserts design image metadata into `design_images`.
 */
export async function registerDesignImage(
  supabase: SupabaseClient,
  input: RegisterDesignImageInput
): Promise<{ success: boolean; data?: DesignImage; error?: string }> {
  const viewType = normalizeViewType(input.viewType, 'FRONT')

  const { data, error } = await supabase
    .from('design_images')
    .insert({
      project_id: input.projectId,
      activity_id: input.activityId,
      storage_path: input.storagePath,
      view_type: viewType,
      file_name: input.fileName || null,
      file_size: input.fileSize || null,
      mime_type: input.mimeType || null,
      metadata: input.metadata || {},
      uploaded_by: input.uploadedBy || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  const designImage: DesignImage = {
    ...(data as DesignImage),
    public_url: getPublicImageUrl(supabase, data.storage_path),
  }

  return { success: true, data: designImage }
}

/**
 * Fetches all supervisor-uploaded site photos for an activity.
 */
export async function getSiteImagesByActivity(
  supabase: SupabaseClient,
  activityId: string
): Promise<SiteImage[]> {
  const { data, error } = await supabase
    .from('site_images')
    .select('*')
    .eq('activity_id', activityId)
    .order('capture_date', { ascending: false })

  if (error) {
    console.error('[Visual DB] Error fetching site images:', error.message)
    return []
  }

  const rows = (data as SiteImage[]) || []
  return rows.map((img) => ({
    ...img,
    public_url: getPublicImageUrl(supabase, img.storage_path),
  }))
}

/**
 * Registers/Inserts site image metadata into `site_images`.
 */
export async function registerSiteImage(
  supabase: SupabaseClient,
  input: RegisterSiteImageInput
): Promise<{ success: boolean; data?: SiteImage; error?: string }> {
  const viewType = normalizeViewType(input.viewType, 'OTHER')
  const captureDate = input.captureDate || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('site_images')
    .insert({
      project_id: input.projectId,
      activity_id: input.activityId,
      storage_path: input.storagePath,
      capture_date: captureDate,
      view_type: viewType,
      file_name: input.fileName || null,
      file_size: input.fileSize || null,
      mime_type: input.mimeType || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      metadata: input.metadata || {},
      uploaded_by: input.uploadedBy || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  const siteImage: SiteImage = {
    ...(data as SiteImage),
    public_url: getPublicImageUrl(supabase, data.storage_path),
  }

  return { success: true, data: siteImage }
}

/**
 * Fetches visual comparison results for an activity with joined image metadata.
 */
export async function getVisualComparisonsByActivity(
  supabase: SupabaseClient,
  activityId: string
): Promise<VisualComparison[]> {
  const { data, error } = await supabase
    .from('visual_comparisons')
    .select('*, design_image:design_images(*), site_image:site_images(*)')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Visual DB] Error fetching visual comparisons:', error.message)
    return []
  }

  const rows = (data as VisualComparison[]) || []
  return rows.map((comp) => {
    const formatted: VisualComparison = { ...comp }
    if (formatted.design_image) {
      formatted.design_image = {
        ...formatted.design_image,
        public_url: getPublicImageUrl(supabase, formatted.design_image.storage_path),
      }
    }
    if (formatted.site_image) {
      formatted.site_image = {
        ...formatted.site_image,
        public_url: getPublicImageUrl(supabase, formatted.site_image.storage_path),
      }
    }
    return formatted
  })
}

/**
 * Creates or updates a visual comparison record between a design image and a site image.
 */
export async function saveVisualComparison(
  supabase: SupabaseClient,
  input: CreateVisualComparisonInput
): Promise<{ success: boolean; data?: VisualComparison; error?: string }> {
  // 1. Fetch design image and site image to validate ownership
  const [designRes, siteRes] = await Promise.all([
    supabase
      .from('design_images')
      .select('id, project_id, activity_id')
      .eq('id', input.designImageId)
      .maybeSingle(),
    supabase
      .from('site_images')
      .select('id, project_id, activity_id')
      .eq('id', input.siteImageId)
      .maybeSingle(),
  ])

  if (!designRes.data) {
    return { success: false, error: `Design image with ID '${input.designImageId}' not found.` }
  }
  if (!siteRes.data) {
    return { success: false, error: `Site image with ID '${input.siteImageId}' not found.` }
  }

  const designImg = designRes.data
  const siteImg = siteRes.data

  // 2. Validate that both images belong to the same activity and project
  if (designImg.activity_id !== siteImg.activity_id) {
    return {
      success: false,
      error: 'Conflict: Both design image and site image must belong to the same activity.',
    }
  }

  if (designImg.project_id !== siteImg.project_id) {
    return {
      success: false,
      error: 'Conflict: Both design image and site image must belong to the same project.',
    }
  }

  const projectId = input.projectId || designImg.project_id
  const activityId = input.activityId || designImg.activity_id
  const completionState = input.completionState
    ? normalizeCompletionState(input.completionState)
    : null
  const status = normalizeComparisonStatus(input.status, 'PENDING_REVIEW')
  const differences = input.differences || []

  // 3. Check if a comparison between this exact image pair already exists
  const { data: existing } = await supabase
    .from('visual_comparisons')
    .select('id')
    .eq('design_image_id', input.designImageId)
    .eq('site_image_id', input.siteImageId)
    .maybeSingle()

  let comparisonId: string

  if (existing) {
    // Update existing comparison record
    const { data: updated, error: updateError } = await supabase
      .from('visual_comparisons')
      .update({
        view_match_score: input.viewMatchScore ?? null,
        visual_similarity: input.visualSimilarity ?? null,
        completion_state: completionState,
        differences: differences,
        confidence: input.confidence ?? null,
        status: status,
        notes: input.notes ?? null,
        reviewed_by: input.reviewedBy ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*, design_image:design_images(*), site_image:site_images(*)')
      .single()

    if (updateError || !updated) {
      return { success: false, error: updateError?.message || 'Failed to update comparison.' }
    }
    comparisonId = updated.id
  } else {
    // Insert new comparison record
    const { data: inserted, error: insertError } = await supabase
      .from('visual_comparisons')
      .insert({
        project_id: projectId,
        activity_id: activityId,
        design_image_id: input.designImageId,
        site_image_id: input.siteImageId,
        view_match_score: input.viewMatchScore ?? null,
        visual_similarity: input.visualSimilarity ?? null,
        completion_state: completionState,
        differences: differences,
        confidence: input.confidence ?? null,
        status: status,
        notes: input.notes ?? null,
        reviewed_by: input.reviewedBy ?? null,
      })
      .select('*, design_image:design_images(*), site_image:site_images(*)')
      .single()

    if (insertError || !inserted) {
      return { success: false, error: insertError?.message || 'Failed to create comparison.' }
    }
    comparisonId = inserted.id
  }

  // 4. Fetch formatted result with public URLs
  const { data: finalRecord } = await supabase
    .from('visual_comparisons')
    .select('*, design_image:design_images(*), site_image:site_images(*)')
    .eq('id', comparisonId)
    .single()

  const formatted: VisualComparison = { ...(finalRecord as VisualComparison) }
  if (formatted.design_image) {
    formatted.design_image = {
      ...formatted.design_image,
      public_url: getPublicImageUrl(supabase, formatted.design_image.storage_path),
    }
  }
  if (formatted.site_image) {
    formatted.site_image = {
      ...formatted.site_image,
      public_url: getPublicImageUrl(supabase, formatted.site_image.storage_path),
    }
  }

  return { success: true, data: formatted }
}

/**
 * Updates review status (VERIFIED / FLAGGED / REJECTED) for a visual comparison.
 */
export async function updateVisualComparisonReview(
  supabase: SupabaseClient,
  input: UpdateVisualComparisonReviewInput
): Promise<{ success: boolean; data?: VisualComparison; error?: string }> {
  const normStatus = normalizeComparisonStatus(input.status)
  const nowIso = new Date().toISOString()

  const updatePayload: Record<string, unknown> = {
    status: normStatus,
    reviewed_at: nowIso,
    updated_at: nowIso,
  }

  if (input.reviewedBy) {
    updatePayload.reviewed_by = input.reviewedBy
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes
  }

  const { data, error } = await supabase
    .from('visual_comparisons')
    .update(updatePayload)
    .eq('id', input.comparisonId)
    .select('*, design_image:design_images(*), site_image:site_images(*)')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Comparison not found or update failed.' }
  }

  const formatted: VisualComparison = { ...(data as VisualComparison) }
  if (formatted.design_image) {
    formatted.design_image = {
      ...formatted.design_image,
      public_url: getPublicImageUrl(supabase, formatted.design_image.storage_path),
    }
  }
  if (formatted.site_image) {
    formatted.site_image = {
      ...formatted.site_image,
      public_url: getPublicImageUrl(supabase, formatted.site_image.storage_path),
    }
  }

  return { success: true, data: formatted }
}

/**
 * Aggregates complete visual evidence for an activity.
 * Automatically triggers AI visual execution verification if matching design and site images exist for a view without a comparison.
 */
export async function getActivityVisualEvidence(
  supabase: SupabaseClient,
  activityIdentifier: string,
  projectId?: string
): Promise<ActivityVisualEvidenceSummary | null> {
  const activity = await resolveActivity(supabase, activityIdentifier, projectId)
  if (!activity) {
    return null
  }

  const [designImages, siteImages, initialComparisons] = await Promise.all([
    getDesignImagesByActivity(supabase, activity.id),
    getSiteImagesByActivity(supabase, activity.id),
    getVisualComparisonsByActivity(supabase, activity.id),
  ])

  let comparisons = initialComparisons

  // Check if any matching design_image & site_image pair for the same view_type is missing a valid comparison
  const existingValidPairKeys = new Set(
    comparisons
      .filter((c) => c.confidence !== null && c.confidence !== undefined && c.confidence > 0)
      .map((c) => `${c.design_image_id}_${c.site_image_id}`)
  )

  const missingPairsToTrigger: Array<{ design: DesignImage; site: SiteImage }> = []
  for (const design of designImages) {
    const matchingSite = siteImages.find((s) => s.view_type === design.view_type)
    if (matchingSite && !existingValidPairKeys.has(`${design.id}_${matchingSite.id}`)) {
      missingPairsToTrigger.push({ design, site: matchingSite })
    }
  }

  if (missingPairsToTrigger.length > 0) {
    const { compareDesignAndSiteImages } = await import('./comparator')
    await Promise.all(
      missingPairsToTrigger.map((pair) =>
        compareDesignAndSiteImages({
          projectId: activity.project_id || projectId || '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4',
          activityId: activity.id,
          activityCode: activity.activity_id,
          activityDescription: activity.description,
          discipline: activity.discipline,
          location: activity.location,
          viewType: pair.design.view_type,
          designImage: pair.design,
          siteImage: pair.site,
          supabase,
        })
      )
    )

    // Re-fetch comparisons after generation
    comparisons = await getVisualComparisonsByActivity(supabase, activity.id)
  }

  const latestComparison = comparisons[0] || null

  return {
    activity_id: activity.id,
    activity_code: activity.activity_id,
    activity_description: activity.description,
    discipline: activity.discipline,
    design_images_count: designImages.length,
    site_images_count: siteImages.length,
    has_comparison: comparisons.length > 0,
    latest_comparison: latestComparison,
    visual_confidence: latestComparison?.confidence ?? null,
    design_images: designImages,
    site_images: siteImages,
    comparisons: comparisons,
  }
}
