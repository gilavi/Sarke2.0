import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/database';

export type OrderDocumentType = 'labor_safety_specialist' | 'alcohol_control' | 'fire_safety_order' | 'fire_safety_order_enterprise';

export const ORDER_DOCUMENT_TYPE_LABEL: Record<OrderDocumentType, string> = {
  labor_safety_specialist: 'შრომის უსაფრთხოების სპეციალისტის დანიშვნა',
  alcohol_control: 'ალკოჰოლური და ნარკოტიკული თრობის კონტროლი',
  fire_safety_order: 'სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა',
  fire_safety_order_enterprise: 'საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა',
};

export interface FireSafetyOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  appointedName: string;
  appointedPhone: string;
  objectName: string;
  objectAddress: string;
  directorSignature: string | null;
  directorSignedAt: string | null;
  appointedSignature: string | null;
  appointedSignedAt: string | null;
}

export interface FireSafetyOrderEnterpriseFormData {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  appointedName: string;
  appointedPhone: string;
  appointedPosition: string;
  appointedIdNumber: string;
  objectName: string;
  objectAddress: string;
  directorSignature: string | null;
  directorSignedAt: string | null;
  appointedSignature: string | null;
  appointedSignedAt: string | null;
}

export interface LaborSafetyOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  facilityName: string;
  specialistName: string;
  specialistPersonalId: string;
  certificateNumber: string;
  certificateDate: string;
}

export interface AlcoholControlOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  facilityName: string;
  responsiblePersonName: string;
  responsiblePersonPosition: string;
  responsiblePersonPersonalId: string;
}

export type OrderFormData =
  | LaborSafetyOrderFormData
  | AlcoholControlOrderFormData
  | FireSafetyOrderFormData
  | FireSafetyOrderEnterpriseFormData;

export interface Order {
  id: string;
  projectId: string;
  userId: string;
  documentType: OrderDocumentType;
  formData: OrderFormData;
  status: 'draft' | 'completed';
  pdfUrl: string | null;
  pdfHash: string | null;
  createdAt: string;
  updatedAt: string;
}

type DbRow = {
  id: string;
  project_id: string;
  user_id: string;
  document_type: string;
  form_data: Record<string, unknown>;
  status: string;
  pdf_url: string | null;
  pdf_hash: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): Order {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    documentType: row.document_type as OrderDocumentType,
    formData: row.form_data as unknown as OrderFormData,
    status: row.status as Order['status'],
    pdfUrl: row.pdf_url,
    pdfHash: row.pdf_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function listOrdersByProject(projectId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toModel(data as DbRow);
}

export async function createOrder(args: {
  projectId: string;
  documentType: OrderDocumentType;
  formData: OrderFormData;
  status: 'draft' | 'completed';
}): Promise<Order> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('orders')
    .insert({
      project_id: args.projectId,
      user_id: user.id,
      document_type: args.documentType,
      form_data: args.formData,
      status: args.status,
    } as unknown as TablesInsert<'orders'>)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toModel(data as DbRow);
}

export async function updateOrder(id: string, patch: {
  formData?: OrderFormData;
  status?: 'draft' | 'completed';
  pdfUrl?: string | null;
  pdfHash?: string | null;
}): Promise<Order> {
  const db: Partial<DbRow> = {};
  if (patch.formData !== undefined) db.form_data = patch.formData as unknown as Record<string, unknown>;
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.pdfUrl !== undefined) db.pdf_url = patch.pdfUrl;
  if (patch.pdfHash !== undefined) db.pdf_hash = patch.pdfHash ?? null;
  const { data, error } = await supabase
    .from('orders')
    .update(db as TablesUpdate<'orders'>)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toModel(data as DbRow);
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
