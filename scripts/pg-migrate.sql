-- Nightscout Next.js — PostgreSQL schema
-- Run once: psql $POSTGRESQL_URI -f scripts/pg-migrate.sql

CREATE TABLE IF NOT EXISTS entries (
  id          BIGSERIAL PRIMARY KEY,
  date        BIGINT        NOT NULL,
  date_string TEXT,
  type        TEXT          NOT NULL,
  sgv         INTEGER,
  mbg         NUMERIC(6,1),
  direction   TEXT,
  noise       SMALLINT,
  filtered    BIGINT,
  unfiltered  BIGINT,
  rssi        SMALLINT,
  device      TEXT
);

CREATE INDEX IF NOT EXISTS entries_date_idx ON entries (date DESC);
CREATE INDEX IF NOT EXISTS entries_type_idx ON entries (type);

CREATE TABLE IF NOT EXISTS treatments (
  id             BIGSERIAL PRIMARY KEY,
  event_type     TEXT          NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  timestamp      BIGINT,
  glucose        NUMERIC(6,1),
  glucose_type   TEXT,
  carbs          NUMERIC(6,1),
  protein        NUMERIC(6,1),
  fat            NUMERIC(6,1),
  insulin        NUMERIC(8,3),
  units          TEXT,
  duration       NUMERIC(8,2),
  percent        NUMERIC(8,2),
  absolute       NUMERIC(8,3),
  rate           NUMERIC(8,3),
  entered_by     TEXT,
  notes          TEXT,
  target_top     NUMERIC(6,1),
  target_bottom  NUMERIC(6,1)
);

CREATE INDEX IF NOT EXISTS treatments_created_at_idx ON treatments (created_at DESC);
CREATE INDEX IF NOT EXISTS treatments_event_type_idx ON treatments (event_type);

-- Device status and profiles store full JSON blobs (same as Nightscout's approach)
CREATE TABLE IF NOT EXISTS device_status (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data       JSONB        NOT NULL
);

CREATE INDEX IF NOT EXISTS device_status_created_at_idx ON device_status (created_at DESC);

CREATE TABLE IF NOT EXISTS profiles (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data       JSONB        NOT NULL
);

CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles (created_at DESC);
