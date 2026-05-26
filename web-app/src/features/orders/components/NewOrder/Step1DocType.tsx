import { Flame, Shield, Ban } from 'lucide-react';
import { ORDER_DOCUMENT_TYPE_LABEL, type OrderDocumentType } from '@/lib/data/orders';
import { ProjectPicker } from '@/components/ui/project-picker';

const DOC_TYPE_OPTIONS: { type: OrderDocumentType; icon: React.ReactNode; label: string }[] = [
  { type: 'labor_safety_specialist',      icon: <Shield size={20} />, label: ORDER_DOCUMENT_TYPE_LABEL.labor_safety_specialist },
  { type: 'alcohol_control',              icon: <Ban size={20} />,    label: ORDER_DOCUMENT_TYPE_LABEL.alcohol_control },
  { type: 'fire_safety_order',            icon: <Flame size={20} />,  label: ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order },
  { type: 'fire_safety_order_enterprise', icon: <Flame size={20} />,  label: ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order_enterprise },
];

export function Step1DocType({
  docType,
  setDocType,
  prefilledProjectId,
  projects,
  selectedProjectId,
  setSelectedProjectId,
}: {
  docType: OrderDocumentType | null;
  setDocType: (t: OrderDocumentType) => void;
  prefilledProjectId: string;
  projects: { id: string; name: string; logo?: string | null; company_name?: string }[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {!prefilledProjectId && (
        <ProjectPicker
          label="პროექტი"
          required
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
        />
      )}
      <h2 className="text-base font-semibold text-neutral-800">ბრძანების ტიპი</h2>
      {DOC_TYPE_OPTIONS.map(({ type, icon, label }) => {
        const selected = docType === type;
        return (
          <button
            key={type}
            onClick={() => setDocType(type)}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
              selected
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 hover:bg-neutral-50'
            }`}
          >
            <span className={selected ? 'text-brand-600' : 'text-neutral-400'}>{icon}</span>
            <span className="flex-1 text-sm font-medium">{label}</span>
            {selected && <span className="text-xs text-brand-600">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
