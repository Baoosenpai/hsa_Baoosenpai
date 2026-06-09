-- ============================================================
-- Exam Academy — PostgreSQL Schema
-- ============================================================
-- Chạy file này một lần khi setup database:
--   psql $DATABASE_URL -f lib/db/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM TYPES ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── USERS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  avatar        TEXT,
  role          user_role    NOT NULL DEFAULT 'student',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ─── QUIZ RESULTS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quiz_results (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  score       SMALLINT     NOT NULL CHECK (score BETWEEN 0 AND 100),
  correct     SMALLINT     NOT NULL,
  total       SMALLINT     NOT NULL,
  percentage  NUMERIC(5,2) NOT NULL,
  time_spent  VARCHAR(20),
  subjects    TEXT,
  flagged     SMALLINT     DEFAULT 0,
  taken_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id  ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_taken_at ON quiz_results(taken_at DESC);

-- ─── REFRESH TOKENS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── DOCUMENTS ───────────────────────────────────────────────
-- Tài liệu admin upload (PDF / DOCX)

DO $$ BEGIN
  CREATE TYPE doc_status AS ENUM ('pending', 'processing', 'done', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_type     VARCHAR(10)  NOT NULL,   -- 'pdf' | 'docx'
  file_size     INT          NOT NULL,   -- bytes
  raw_text      TEXT,                    -- nội dung đã extract
  status        doc_status   NOT NULL DEFAULT 'pending',
  error_msg     TEXT,
  subject       VARCHAR(100),            -- môn học (Toán, Lý, ...)
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status      ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_subject     ON documents(subject);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── QUESTIONS ───────────────────────────────────────────────
-- Câu hỏi trắc nghiệm (sinh bởi AI hoặc parse từ tài liệu)

DO $$ BEGIN
  CREATE TYPE question_source AS ENUM ('ai_generated', 'parsed', 'manual');
  CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS questions (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID           REFERENCES documents(id) ON DELETE SET NULL,
  created_by    UUID           REFERENCES users(id) ON DELETE SET NULL,
  content       TEXT           NOT NULL,           -- nội dung câu hỏi
  explanation   TEXT,                              -- giải thích đáp án
  subject       VARCHAR(100),
  difficulty    difficulty     NOT NULL DEFAULT 'medium',
  source        question_source NOT NULL DEFAULT 'ai_generated',
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject     ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_is_active   ON questions(is_active);

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── OPTIONS ─────────────────────────────────────────────────
-- Các lựa chọn A/B/C/D của mỗi câu hỏi

CREATE TABLE IF NOT EXISTS options (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label         CHAR(1)  NOT NULL,     -- 'A', 'B', 'C', 'D'
  content       TEXT     NOT NULL,
  is_correct    BOOLEAN  NOT NULL DEFAULT FALSE,
  UNIQUE (question_id, label)
);

CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);
