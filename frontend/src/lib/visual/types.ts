export type ImageViewType =
  | 'FRONT'
  | 'LEFT'
  | 'RIGHT'
  | 'TOP'
  | 'ISOMETRIC'
  | 'PERSPECTIVE'
  | 'SECTION'
  | 'OTHER'

export type CompletionState =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'NEAR_COMPLETE'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'UNKNOWN'

export type VisualComparisonStatus =
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'FLAGGED'
  | 'REJECTED'

export interface DesignImage {
  id: string
  project_id: string
  activity_id: string
  storage_path: string
  view_type: ImageViewType
  file_name?: string | null
  file_size?: number | null
  mime_type?: string | null
  metadata?: Record<string, unknown> | null
  uploaded_by?: string | null
  created_at: string
  public_url?: string
}

export interface SiteImage {
  id: string
  project_id: string
  activity_id: string
  storage_path: string
  capture_date: string
  view_type: ImageViewType
  file_name?: string | null
  file_size?: number | null
  mime_type?: string | null
  latitude?: number | null
  longitude?: number | null
  metadata?: Record<string, unknown> | null
  uploaded_by?: string | null
  created_at: string
  public_url?: string
}

export interface VisualComparison {
  id: string
  project_id: string
  activity_id: string
  design_image_id?: string | null
  site_image_id?: string | null
  view_match_score?: number | null
  visual_similarity?: number | null
  completion_state?: CompletionState | null
  differences?: string[] | Record<string, unknown> | null
  confidence?: number | null
  status: VisualComparisonStatus
  notes?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
  design_image?: DesignImage | null
  site_image?: SiteImage | null
}

export interface ActivityVisualEvidenceSummary {
  activity_id: string
  activity_code?: string
  activity_description?: string
  discipline?: string | null
  design_images_count: number
  site_images_count: number
  has_comparison: boolean
  latest_comparison?: VisualComparison | null
  visual_confidence?: number | null
  design_images: DesignImage[]
  site_images: SiteImage[]
  comparisons: VisualComparison[]
}

export interface RegisterDesignImageInput {
  projectId: string
  activityId: string
  storagePath: string
  viewType?: ImageViewType | string
  fileName?: string
  fileSize?: number
  mimeType?: string
  metadata?: Record<string, unknown>
  uploadedBy?: string
}

export interface RegisterSiteImageInput {
  projectId: string
  activityId: string
  storagePath: string
  captureDate?: string
  viewType?: ImageViewType | string
  fileName?: string
  fileSize?: number
  mimeType?: string
  latitude?: number
  longitude?: number
  metadata?: Record<string, unknown>
  uploadedBy?: string
}

export interface CreateVisualComparisonInput {
  designImageId: string
  siteImageId: string
  projectId?: string
  activityId?: string
  viewMatchScore?: number
  visualSimilarity?: number
  completionState?: CompletionState | string
  differences?: string[] | Record<string, unknown>
  confidence?: number
  status?: VisualComparisonStatus | string
  notes?: string
  reviewedBy?: string
}

export interface UpdateVisualComparisonReviewInput {
  comparisonId: string
  status: VisualComparisonStatus
  notes?: string
  reviewedBy?: string
}
