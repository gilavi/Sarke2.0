/**
 * InspectionSignatures — displays the list of signatories for any inspection entity
 * and (when canEdit) allows adding new ones via a name/role + canvas modal.
 *
 * Props:
 *   inspection  Minimal signatory-owner shape (inspector_signature, inspector_name, signatories, dates)
 *   canEdit     Whether new signatories can be added / existing ones removed (true when completed)
 *   onUpdate    Called with the updated signatories array; caller persists via updateInspection
 */
import { useState } from 'react';
import { Modal, TextInput } from '@mantine/core';
import { Trash2, UserPlus } from 'lucide-react';
import SignatureCanvas from '@/components/SignatureCanvas';
import { type SignatoryEntry } from '@/lib/data/inspections';

interface SignableInspection {
  inspector_signature?: string | null;
  inspector_name?: string | null;
  completed_at?: string | null;
  created_at: string;
  signatories: SignatoryEntry[];
}

interface Props {
  inspection: SignableInspection;
  canEdit: boolean;
  onUpdate: (signatories: SignatoryEntry[]) => void;
}

export default function InspectionSignatures({ inspection, canEdit, onUpdate }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  const signatories: SignatoryEntry[] = inspection.signatories ?? [];

  function openModal() {
    setNewName('');
    setNewRole('');
    setPendingSignature(null);
    setModalOpen(true);
  }

  function handleSave(dataUrl: string) {
    const entry: SignatoryEntry = {
      name: newName.trim() || 'გამოუცნობი',
      role: newRole.trim(),
      signature: dataUrl,
      signed_at: new Date().toISOString(),
    };
    onUpdate([...signatories, entry]);
    setModalOpen(false);
  }

  function handleRemove(index: number) {
    onUpdate(signatories.filter((_, i) => i !== index));
  }

  const hasAny = !!inspection.inspector_signature || signatories.length > 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          ხელმოწერები
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-xl border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400 dark:hover:bg-brand-950/20"
          >
            <UserPlus size={13} />
            + პირის დამატება
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasAny && (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          ხელმოწერები არ არის.
        </p>
      )}

      {/* Signatory rows */}
      <div className="space-y-3">
        {/* Pinned: inspector's own signature (stored as bare base64, normalise to data URL) */}
        {inspection.inspector_signature && (
          <SignatoryRow
            name={inspection.inspector_name ?? 'ინსპექტორი'}
            role="ინსპექტორი"
            signature={`data:image/png;base64,${inspection.inspector_signature}`}
            signedAt={inspection.completed_at ?? inspection.created_at}
            pinned
          />
        )}

        {/* Additional signatories (signature is already a full data URL) */}
        {signatories.map((s, i) => (
          <SignatoryRow
            key={i}
            name={s.name}
            role={s.role}
            signature={s.signature}
            signedAt={s.signed_at}
            onRemove={canEdit ? () => handleRemove(i) : undefined}
          />
        ))}
      </div>

      {/* Add person modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="პირის დამატება"
        centered
        size="md"
        radius="lg"
        overlayProps={{ blur: 2 }}
      >
        <div className="space-y-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="სახელი / გვარი"
              placeholder="გ. ხელაძე"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              radius="md"
            />
            <TextInput
              label="როლი"
              placeholder="სამშენებლო მენეჯერი"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              radius="md"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              ხელმოწერა
            </p>
            <SignatureCanvas
              onSave={handleSave}
              onCancel={() => setModalOpen(false)}
              existing={pendingSignature}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Internal row component ── */

function SignatoryRow({
  name,
  role,
  signature,
  signedAt,
  pinned,
  onRemove,
}: {
  name: string;
  role: string;
  signature: string;
  signedAt: string;
  pinned?: boolean;
  onRemove?: () => void;
}) {
  const dateStr = (() => {
    try {
      return new Date(signedAt).toLocaleDateString('ka-GE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return signedAt;
    }
  })();

  return (
    <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      {/* Signature thumbnail */}
      <div className="shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-700">
        <img
          src={signature}
          alt={`${name} ხელმოწერა`}
          className="h-14 w-28 object-contain"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{name}</p>
            {role && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{role}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pinned && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                ინსპექტორი
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                aria-label="წაშლა"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{dateStr}</p>
      </div>
    </div>
  );
}
