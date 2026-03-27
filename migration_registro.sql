-- ============================================================
-- Migration: registro.provnr.com
-- Run in Supabase SQL Editor before deploying registro
-- ============================================================

-- 1. Export documents table
-- Stores all lot documents except phytosanitary (which has dedicated columns).
-- Each row is one document attached to one lot.
CREATE TABLE IF NOT EXISTS lot_export_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id        TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL,         -- 'Certificate of Origin', 'Fumigation Certificate', etc.
  doc_number    TEXT,                  -- reference number on the document
  issuer        TEXT,                  -- issuing body
  issued_date   DATE,
  expires_date  DATE,
  storage_path  TEXT,                  -- Supabase Storage path (lot-documents bucket)
  status        TEXT DEFAULT 'Pending', -- 'Valid', 'Pending', 'Expired'
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  notes         TEXT
);

-- Index for fast lookups by lot
CREATE INDEX IF NOT EXISTS idx_lot_export_docs_lot_id
  ON lot_export_docs (lot_id);

-- 2. RLS on lot_export_docs
ALTER TABLE lot_export_docs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all docs
CREATE POLICY "Authenticated can read lot_export_docs"
  ON lot_export_docs FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated can insert lot_export_docs"
  ON lot_export_docs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "Authenticated can update lot_export_docs"
  ON lot_export_docs FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete
CREATE POLICY "Authenticated can delete lot_export_docs"
  ON lot_export_docs FOR DELETE
  TO authenticated
  USING (true);

-- 3. RLS on lots — authenticated users can update lot fields
-- (Public read policy was already added for portal anon access)
CREATE POLICY "Authenticated can update lots"
  ON lots FOR UPDATE
  TO authenticated
  USING (true);

-- 4. Storage: allow authenticated users to read from lot-documents
-- (INSERT and UPDATE policies were added in the phyto cert migration)
-- This ensures authenticated users in registro can also generate signed URLs
-- The anon SELECT policy is NOT added here — registro uses auth, not anon key
