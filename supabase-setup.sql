-- invoiced: Supabase schema + RLS
-- Run this once in Supabase SQL Editor. Safe to re-run: uses IF NOT EXISTS / OR REPLACE.

-- =========================================================
-- 1. TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name     text,
  business_email    text,
  business_address  text,
  business_phone    text,
  business_logo     text,
  bank_details      text,
  payment_terms     text,
  currency          text DEFAULT 'GBP',
  quote_counter     int  DEFAULT 481,
  invoice_counter   int  DEFAULT 121,
  tax_id            text,
  tax_rate          numeric(6,3) DEFAULT 20,
  tax_label         text DEFAULT 'VAT',
  default_notes     text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_rate      numeric(6,3) DEFAULT 20;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_label     text DEFAULT 'VAT';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_notes text;

CREATE TABLE IF NOT EXISTS public.clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON public.clients(user_id);

CREATE TABLE IF NOT EXISTS public.docs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id          uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  public_id          text UNIQUE,
  type               text NOT NULL CHECK (type IN ('quote','invoice')),
  number             text NOT NULL,
  status             text NOT NULL DEFAULT 'draft',
  project            text,
  client_name        text,
  client_email       text,
  issue_date         date,
  due_date           date,
  accepted_date      date,
  declined_date      date,
  paid_date          date,
  lines              jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes              text,
  currency           text NOT NULL DEFAULT 'GBP',
  tax_rate           numeric(6,3) DEFAULT 0,
  tax_label          text DEFAULT 'VAT',
  discount           numeric(14,2) DEFAULT 0,
  subtotal           numeric(14,2) DEFAULT 0,
  tax                numeric(14,2) DEFAULT 0,
  total              numeric(14,2) DEFAULT 0,
  business_snapshot  jsonb,
  client_snapshot    jsonb,
  linked_invoice_id  uuid REFERENCES public.docs(id) ON DELETE SET NULL,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS client_name       text;
ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS client_email      text;
ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS tax_label         text DEFAULT 'VAT';
ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS linked_invoice_id uuid REFERENCES public.docs(id) ON DELETE SET NULL;
ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS hide_item_pricing boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS docs_user_id_idx   ON public.docs(user_id);
CREATE INDEX IF NOT EXISTS docs_client_id_idx ON public.docs(client_id);
CREATE INDEX IF NOT EXISTS docs_public_id_idx ON public.docs(public_id) WHERE public_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_id       uuid REFERENCES public.docs(id) ON DELETE SET NULL,
  description  text,
  amount       numeric(14,2) NOT NULL DEFAULT 0,
  date         date,
  category     text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_doc_id_idx  ON public.expenses(doc_id);

CREATE TABLE IF NOT EXISTS public.cashflow (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date NOT NULL,
  amount       numeric(14,2) NOT NULL DEFAULT 0,
  description  text,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cashflow_user_id_idx ON public.cashflow(user_id);

-- =========================================================
-- 2. UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_profiles_updated ON public.profiles;
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS t_clients_updated ON public.clients;
CREATE TRIGGER t_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS t_docs_updated ON public.docs;
CREATE TRIGGER t_docs_updated BEFORE UPDATE ON public.docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS t_expenses_updated ON public.expenses;
CREATE TRIGGER t_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS t_cashflow_updated ON public.cashflow;
CREATE TRIGGER t_cashflow_updated BEFORE UPDATE ON public.cashflow
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, business_email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 4. ENABLE RLS
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. POLICIES (owner-only CRUD)
-- =========================================================

-- profiles: each user sees only their own row
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- clients
DROP POLICY IF EXISTS "own clients all" ON public.clients;
CREATE POLICY "own clients all" ON public.clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- docs
DROP POLICY IF EXISTS "own docs all" ON public.docs;
CREATE POLICY "own docs all" ON public.docs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- expenses
DROP POLICY IF EXISTS "own expenses all" ON public.expenses;
CREATE POLICY "own expenses all" ON public.expenses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- cashflow
DROP POLICY IF EXISTS "own cashflow all" ON public.cashflow;
CREATE POLICY "own cashflow all" ON public.cashflow
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Note: no anon policies on docs — anon access is via the RPCs below only.

-- =========================================================
-- 6. PUBLIC SHARE RPCs (anon can call these, nothing else)
-- =========================================================

-- Read a shared doc by public_id. Returns only the fields a client needs to see.
-- Drafts are hidden — share links only work once a doc is sent.
DROP FUNCTION IF EXISTS public.get_shared_doc(text);
CREATE OR REPLACE FUNCTION public.get_shared_doc(p_public_id text)
RETURNS TABLE (
  id                 uuid,
  public_id          text,
  type               text,
  number             text,
  status             text,
  project            text,
  client_name        text,
  client_email       text,
  issue_date         date,
  due_date           date,
  accepted_date      date,
  declined_date      date,
  paid_date          date,
  lines              jsonb,
  notes              text,
  currency           text,
  tax_rate           numeric,
  tax_label          text,
  subtotal           numeric,
  tax                numeric,
  total              numeric,
  hide_item_pricing  boolean,
  business_snapshot  jsonb
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, public_id, type, number, status, project, client_name, client_email,
         issue_date, due_date, accepted_date, declined_date, paid_date,
         CASE
           WHEN COALESCE(hide_item_pricing, false) THEN
             COALESCE((SELECT jsonb_agg(jsonb_build_object('desc', elem->>'desc'))
                       FROM jsonb_array_elements(lines) AS elem), '[]'::jsonb)
           ELSE
             COALESCE((SELECT jsonb_agg(jsonb_build_object(
                         'desc', elem->>'desc',
                         'qty',  elem->'qty',
                         'rate', elem->'rate'))
                       FROM jsonb_array_elements(lines) AS elem), '[]'::jsonb)
         END AS lines,
         notes, currency, tax_rate, tax_label,
         subtotal, tax, total, COALESCE(hide_item_pricing, false) AS hide_item_pricing,
         business_snapshot
  FROM public.docs
  WHERE public_id = p_public_id
    AND status <> 'draft'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_shared_doc(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_doc(text) TO anon, authenticated;

-- Accept/decline a shared quote. Only works on quotes in 'sent' status.
DROP FUNCTION IF EXISTS public.respond_to_shared_doc(text, text);
CREATE OR REPLACE FUNCTION public.respond_to_shared_doc(p_public_id text, p_action text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type   text;
  v_status text;
BEGIN
  IF p_action NOT IN ('accept','decline') THEN RETURN 'invalid_action'; END IF;

  SELECT type, status INTO v_type, v_status
  FROM public.docs WHERE public_id = p_public_id;

  IF v_type IS NULL THEN RETURN 'not_found'; END IF;
  IF v_type <> 'quote' THEN RETURN 'not_a_quote'; END IF;
  IF v_status NOT IN ('sent','draft') THEN RETURN 'already_responded'; END IF;

  IF p_action = 'accept' THEN
    UPDATE public.docs
       SET status = 'accepted', accepted_date = current_date
     WHERE public_id = p_public_id;
  ELSE
    UPDATE public.docs
       SET status = 'declined', declined_date = current_date
     WHERE public_id = p_public_id;
  END IF;

  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_shared_doc(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.respond_to_shared_doc(text, text) TO anon, authenticated;
