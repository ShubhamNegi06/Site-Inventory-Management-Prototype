export type UserRole = "admin" | "site";

export interface Site {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  site_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type FieldType = "text" | "number" | "date" | "select" | "boolean";

export interface FieldDefinition {
  id: string;
  site_id: string | null;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  section: string | null;
  options: string | null;
  is_autofill: boolean;
  created_at: string;
}

export interface Sample {
  id: string;
  site_id: string;
  subject_code: string | null;
  sample_code: string;
  sample_type: string;
  collection_date: string | null;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SamplePage {
  total: number;
  page: number;
  page_size: number;
  items: Sample[];
}

export interface Subject {
  subject_code: string;
  site_id: string;
  sample_count: number;
  sample_types: string[];
  first_collection_date: string | null;
  last_collection_date: string | null;
  data: Record<string, unknown>;
}

export interface SubjectPage {
  total: number;
  page: number;
  page_size: number;
  items: Subject[];
}

export interface Report {
  id: string;
  sample_id: string;
  file_name: string;
  content_type: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export const SAMPLE_TYPES = ["FFPE Block", "Frozen Tumor", "Serum", "Plasma", "Other"];

export interface FieldSuggestion {
  key: string;
  label: string;
  type: string;
}

export interface SubjectSuggestion {
  subject_code: string;
  sample_count: number;
}

export interface SubjectAutofill {
  subject_code: string;
  found: boolean;
  data: Record<string, unknown>;
}

// --- Bulk import (Excel) --------------------------------------------

export interface BulkImportRow {
  row_number: number;
  sheet: string;
  subject_code: string | null;
  sample_code: string | null;
  sample_type: string | null;
  collection_date: string | null;
  data: Record<string, unknown>;
  errors: string[];
}

export interface BulkImportPreviewResponse {
  rows: BulkImportRow[];
  unmapped_columns: string[];
  valid_count: number;
  error_count: number;
}

export interface BulkImportRowResult {
  row_number: number;
  sheet: string;
  sample_code: string;
  status: "created" | "failed";
  error: string | null;
}

export interface BulkImportCommitResponse {
  created: number;
  failed: number;
  results: BulkImportRowResult[];
}