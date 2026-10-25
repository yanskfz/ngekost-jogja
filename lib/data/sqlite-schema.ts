// Local development/test schema only. SQLite is NOT the production database; see docs/PUBLIC_LAUNCH_DATABASE.md.
export const SQLITE_SCHEMA = `
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  role TEXT NOT NULL CHECK (role IN ('submitter','admin')),
  submitter_type TEXT CHECK (submitter_type IN ('owner','broker')),
  email_verified_at TEXT,
  whatsapp_verified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kost','kontrakan')),
  area TEXT NOT NULL CHECK (area IN ('sleman','kota_jogja')),
  address TEXT NOT NULL,
  map_latitude REAL NOT NULL,
  map_longitude REAL NOT NULL,
  price_monthly INTEGER NOT NULL CHECK (price_monthly > 0),
  deposit_information TEXT,
  facilities TEXT NOT NULL DEFAULT '[]',
  condition_details TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_whatsapp TEXT NOT NULL,
  source_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner','broker')),
  status TEXT NOT NULL CHECK (status IN ('draft','pending','approved','rejected','reported','hidden','expired','archived')),
  owner_id TEXT NOT NULL REFERENCES accounts(id),
  source TEXT NOT NULL,
  permission_status TEXT NOT NULL CHECK (permission_status IN ('granted','pending','unknown')),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified','verified')),
  last_confirmed_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  position INTEGER NOT NULL CHECK (position IN (1,2,3)),
  storage_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (listing_id, position)
);

CREATE TABLE consents (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  publish_allowed INTEGER NOT NULL CHECK (publish_allowed IN (0,1)),
  contact_allowed INTEGER NOT NULL CHECK (contact_allowed IN (0,1)),
  consent_text_version TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  audit_id TEXT NOT NULL
);

CREATE TABLE moderation_events (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  admin_id TEXT NOT NULL REFERENCES accounts(id),
  action TEXT NOT NULL CHECK (action IN ('approve','reject','hide','restore','expire','reconfirm')),
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  reporter_contact TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('suspected_scam','wrong_location','unavailable','misleading_price','abuse')),
  detail TEXT,
  status TEXT NOT NULL CHECK (status IN ('open','investigating','resolved','dismissed')),
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES accounts(id),
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX listings_status_expiry ON listings (status, expires_at);
CREATE INDEX listings_owner ON listings (owner_id);
`;
