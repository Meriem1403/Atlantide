import pool from '../src/config/database.js';

const schema = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  org_name VARCHAR(255) NOT NULL DEFAULT 'Mairie de Paris',
  org_logo TEXT NOT NULL DEFAULT '',
  notification_email VARCHAR(255) NOT NULL DEFAULT ''
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS mail_from VARCHAR(255) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  code VARCHAR(10) NOT NULL DEFAULT '',
  numerotation VARCHAR(32) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agents ADD COLUMN IF NOT EXISTS numerotation VARCHAR(32) NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS agent_monthly_plans (
  id VARCHAR(32) PRIMARY KEY,
  agent_id VARCHAR(32) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  service_name VARCHAR(255) NOT NULL DEFAULT '',
  ticket_count INTEGER NOT NULL DEFAULT 0,
  face_value DECIMAL(10, 2) NOT NULL,
  subsidy DECIMAL(10, 2) NOT NULL,
  numerotation VARCHAR(32),
  notes TEXT,
  UNIQUE (agent_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_plans_month ON agent_monthly_plans(month);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_service ON agent_monthly_plans(service_name);

CREATE TABLE IF NOT EXISTS providers (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  siret VARCHAR(50) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subventions (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  face_value DECIMAL(10, 2) NOT NULL,
  subsidy DECIMAL(10, 2) NOT NULL,
  tickets_per_month INTEGER NOT NULL,
  applies_to JSONB NOT NULL DEFAULT '"all"',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agent', 'provider')),
  profile_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  setup_token VARCHAR(128),
  setup_token_expires TIMESTAMPTZ,
  reset_token VARCHAR(128),
  reset_token_expires TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_token VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_setup_token ON users(setup_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(64) PRIMARY KEY,
  number VARCHAR(50) UNIQUE NOT NULL,
  agent_id VARCHAR(32) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_name VARCHAR(255) NOT NULL,
  month VARCHAR(7) NOT NULL,
  face_value DECIMAL(10, 2) NOT NULL,
  subsidy DECIMAL(10, 2) NOT NULL,
  agent_contribution DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  provider_id VARCHAR(32) REFERENCES providers(id),
  provider_name VARCHAR(255),
  qr_data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_invoices (
  id VARCHAR(32) PRIMARY KEY,
  provider_id VARCHAR(32) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_name VARCHAR(255) NOT NULL,
  month VARCHAR(7) NOT NULL,
  ticket_count INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  subsidy_amount DECIMAL(10, 2) NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  file_data TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_agent_month ON tickets(agent_id, month);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON provider_invoices(provider_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    await client.query(
      `INSERT INTO settings (id, org_name, org_logo) VALUES (1, 'Mairie de Paris', '')
       ON CONFLICT (id) DO NOTHING`
    );
    console.log('Migration terminée.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
