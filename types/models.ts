// Domain types mirrored from the Supabase schema (supabase/migrations/0001_init.sql).

export type SignerRole = 'expert' | 'xaracho_supervisor' | 'xaracho_assembler';

export const SIGNER_ROLE_LABEL: Record<SignerRole, string> = {
  expert: 'შრომის უსაფრთხოების სპეციალისტი',
  xaracho_supervisor: 'ხარაჩოს ზედამხედველი',
  xaracho_assembler: 'ხარაჩოს ამწყობი',
};

export type QuestionType =
  | 'yesno'
  | 'measure'
  | 'component_grid'
  | 'freetext'
  | 'photo_upload';

export type QuestionnaireStatus = 'draft' | 'completed';

export interface AppUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  tc_accepted_version: string | null;
  tc_accepted_at: string | null;
}

export interface Certificate {
  id: string;
  user_id: string;
  type: string;
  number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  created_at: string;
}

export interface ProjectSigner {
  id: string;
  project_id: string;
  role: SignerRole;
  full_name: string;
  phone: string | null;
  position: string | null;
  signature_png_url: string | null;
}

export interface Template {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  is_system: boolean;
  required_cert_types: string[];
  required_signer_roles: SignerRole[];
}

export interface Question {
  id: string;
  template_id: string;
  section: number;
  order: number;
  type: QuestionType;
  title: string;
  min_val: number | null;
  max_val: number | null;
  unit: string | null;
  grid_rows: string[] | null;
  grid_cols: string[] | null;
}

export interface Questionnaire {
  id: string;
  project_id: string;
  template_id: string;
  user_id: string;
  status: QuestionnaireStatus;
  harness_name: string | null;
  conclusion_text: string | null;
  is_safe_for_use: boolean | null;
  pdf_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export type GridValues = Record<string, Record<string, string>>;

export interface Answer {
  id: string;
  questionnaire_id: string;
  question_id: string;
  value_bool: boolean | null;
  value_num: number | null;
  value_text: string | null;
  grid_values: GridValues | null;
  comment: string | null;
}

export interface AnswerPhoto {
  id: string;
  answer_id: string;
  storage_path: string;
  caption: string | null;
}

export interface SignatureRecord {
  id: string;
  questionnaire_id: string;
  signer_role: SignerRole;
  full_name: string;
  phone: string | null;
  position: string | null;
  signature_png_url: string;
  signed_at: string;
}
