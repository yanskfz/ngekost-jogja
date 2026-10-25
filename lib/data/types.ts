// Data contracts from BRIEF.md "Data". Shared by the dummy preview fixtures and the local SQLite adapter.

export const LISTING_TYPES = ['kost', 'kontrakan'] as const;
export const AREAS = ['sleman', 'kota_jogja'] as const;
export const SUBMITTER_ROLES = ['owner', 'broker'] as const;
export const LISTING_STATUSES = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'reported',
  'hidden',
  'expired',
  'archived',
] as const;
export const MODERATION_ACTIONS = ['approve', 'reject', 'hide', 'restore', 'expire', 'reconfirm'] as const;
export const REPORT_REASONS = ['suspected_scam', 'wrong_location', 'unavailable', 'misleading_price', 'abuse'] as const;
export const REPORT_STATUSES = ['open', 'investigating', 'resolved', 'dismissed'] as const;

export const PRICE_PERIODS = ['bulan', 'tahun'] as const;
export type PricePeriod = (typeof PRICE_PERIODS)[number];
export type ListingType = (typeof LISTING_TYPES)[number];
export type Area = (typeof AREAS)[number];
export type SubmitterType = (typeof SUBMITTER_ROLES)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type AccountRole = 'submitter' | 'admin';

/** ISO-8601 UTC timestamp. */
export type Timestamp = string;

export type Account = {
  id: string;
  email: string;
  whatsapp: string | null;
  role: AccountRole;
  submitter_type: SubmitterType | null;
  email_verified_at: Timestamp | null;
  whatsapp_verified_at: Timestamp | null;
  created_at: Timestamp;
};

export type Listing = {
  id: string;
  title: string;
  type: ListingType;
  area: Area;
  address: string;
  map_latitude: number;
  map_longitude: number;
  /** Displayed price amount in IDR. Name is historical; the unit is given by price_period. */
  price_monthly: number;
  price_period: PricePeriod;
  deposit_information: string | null;
  facilities: string[];
  condition_details: string;
  contact_name: string;
  contact_whatsapp: string;
  source_url: string | null;
  role: SubmitterType;
  status: ListingStatus;
  owner_id: string;
  source: string;
  permission_status: 'granted' | 'pending' | 'unknown';
  verification_status: 'unverified' | 'verified';
  last_confirmed_at: Timestamp | null;
  expires_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  position: 1 | 2 | 3;
  storage_path: string;
  created_at: Timestamp;
};

export type Consent = {
  id: string;
  listing_id: string;
  account_id: string;
  publish_allowed: boolean;
  contact_allowed: boolean;
  consent_text_version: string;
  captured_at: Timestamp;
  /** Privacy-preserving audit identifier (opaque hash, never an IP address or raw contact). */
  audit_id: string;
};

export type ModerationEvent = {
  id: string;
  listing_id: string;
  admin_id: string;
  action: ModerationAction;
  reason: string | null;
  created_at: Timestamp;
};

export type Report = {
  id: string;
  listing_id: string;
  reporter_contact: string | null;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  created_at: Timestamp;
  resolved_at: Timestamp | null;
};

export type ImportBatch = {
  id: string;
  admin_id: string;
  filename: string;
  row_count: number;
  created_at: Timestamp;
};

export type DevData = {
  accounts: Account[];
  listings: Listing[];
  images: ListingImage[];
  consents: Consent[];
  moderationEvents: ModerationEvent[];
  reports: Report[];
  importBatches: ImportBatch[];
};

/** Public listing: what a visitor may see. Excludes owner_id, source, permission/verification internals. */
export type PublicListing = Pick<
  Listing,
  | 'id'
  | 'title'
  | 'type'
  | 'area'
  | 'address'
  | 'map_latitude'
  | 'map_longitude'
  | 'price_monthly'
  | 'price_period'
  | 'deposit_information'
  | 'facilities'
  | 'condition_details'
  | 'contact_name'
  | 'contact_whatsapp'
  | 'role'
  | 'last_confirmed_at'
  | 'expires_at'
>;
