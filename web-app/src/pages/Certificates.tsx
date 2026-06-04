import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { useAuth } from '@/lib/auth';
import { listCertificates, signedCertificatePdfUrl, uploadCertificate } from '@/lib/data/certificates';
import { certificateDisplayName } from '@/lib/documentNames';
import { certificateKeys } from '@/app/queryKeys';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Certificates() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items, error: queryError, isLoading } = useQuery({
    queryKey: certificateKeys.lists(),
    queryFn: listCertificates,
  });

  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error('არაავტორიზებული');
      return uploadCertificate(file, user);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: certificateKeys.lists() });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
    e.target.value = '';
  }

  async function openPdf(path: string, id: string) {
    try {
      setOpeningId(id);
      const url = await signedCertificatePdfUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setOpenError(humanizeError(e));
    } finally {
      setOpeningId(null);
    }
  }

  const displayError = openError
    ?? (queryError ? humanizeError(queryError) : null)
    ?? (uploadMutation.error ? humanizeError(uploadMutation.error) : null);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">სერტიფიკატები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">გენერირებული და ატვირთული PDF სერტიფიკატები.</p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="shrink-0 gap-1.5"
        >
          <Upload size={15} />
          {uploadMutation.isPending ? 'იტვირთება…' : 'ატვირთვა'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </header>

      {displayError && (
        <ErrorMessage>{displayError}</ErrorMessage>
      )}

      {isLoading && <SkeletonList count={4} />}

      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <FileText size={22} className="text-neutral-400 dark:text-neutral-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">სერტიფიკატები ვერ მოიძებნა</p>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">ატვირთეთ PDF ან გენერირება მოახდინეთ შემოწმებიდან</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="gap-1.5"
          >
            <Upload size={13} />
            PDF-ის ატვირთვა
          </Button>
        </div>
      )}

      {items && items.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {items.map((c) => {
            const name = certificateDisplayName(c.conclusion_text);
            return (
              <motion.div
                key={c.id}
                variants={itemVariants}
                className="group flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/20">
                    <FileText size={18} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                      {new Date(c.generated_at).toLocaleDateString('ka-GE')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openPdf(c.pdf_url, c.id)}
                  disabled={openingId === c.id}
                  className="shrink-0"
                >
                  {openingId === c.id ? 'იხსნება…' : 'PDF-ის ნახვა'}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
