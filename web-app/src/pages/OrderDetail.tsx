import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, RotateCcw } from 'lucide-react';
import DeleteButton from '@/components/DeleteButton';

import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { Button } from '@/components/ui/button';
import SignatureCanvas from '@/components/SignatureCanvas';
import {
  getOrder,
  updateOrder,
  deleteOrder,
  ORDER_DOCUMENT_TYPE_LABEL,
  type FireSafetyOrderFormData,
  type FireSafetyOrderEnterpriseFormData,
  type LaborSafetyOrderFormData,
  type AlcoholControlOrderFormData,
} from '@/lib/data/orders';
import { getProject } from '@/lib/data/projects';
import { routes } from '@/app/routes';
import { projectKeys, orderKeys } from '@/app/queryKeys';
import {
  buildFireSafetyOrderHtml,
  buildFireSafetyOrderEnterpriseHtml,
  buildLaborSafetyOrderHtml,
  buildAlcoholControlOrderHtml,
  openOrderPdfPreview,
} from '@/lib/orderPdf';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError, toastError } from '@/lib/errors';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });
  const projectId = order?.projectId;
  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const [signingDirector, setSigningDirector] = useState(false);
  const [signingAppointed, setSigningAppointed] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateOrder>[1]) => updateOrder(id!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.detail(id) }),
    onError: (e) => toastError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: orderKeys.lists() }); navigate(-1); },
    onError: (e) => toastError(e),
  });

  if (isLoading) return <SkeletonDetailPage />;
  if (error) return (
    <ErrorMessage>{humanizeError(error)}</ErrorMessage>
  );
  if (!order) return <p className="text-sm text-neutral-500">ბრძანება ვერ მოიძებნა.</p>;

  const isFireSafety = order.documentType === 'fire_safety_order';
  const isFireSafetyEnterprise = order.documentType === 'fire_safety_order_enterprise';
  const isFireSafetyVariant = isFireSafety || isFireSafetyEnterprise;
  const fd = order.formData as FireSafetyOrderFormData;
  const fdEnterprise = order.formData as FireSafetyOrderEnterpriseFormData;
  const fdLabor = order.formData as LaborSafetyOrderFormData;
  const fdAlcohol = order.formData as AlcoholControlOrderFormData;

  function openPdf() {
    let html = '';
    if (order!.documentType === 'fire_safety_order') html = buildFireSafetyOrderHtml(fd);
    else if (order!.documentType === 'fire_safety_order_enterprise') html = buildFireSafetyOrderEnterpriseHtml(fdEnterprise);
    else if (order!.documentType === 'alcohol_control') html = buildAlcoholControlOrderHtml(fdAlcohol);
    else html = buildLaborSafetyOrderHtml(fdLabor);
    openOrderPdfPreview(html);
  }

  function saveDirectorSig(dataUrl: string) {
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const base = isFireSafetyEnterprise ? fdEnterprise : fd;
    const newFd = { ...base, directorSignature: b64, directorSignedAt: new Date().toISOString() };
    updateMutation.mutate({ formData: newFd, status: newFd.appointedSignature ? 'completed' : order!.status });
    setSigningDirector(false);
  }

  function saveAppointedSig(dataUrl: string) {
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const base = isFireSafetyEnterprise ? fdEnterprise : fd;
    const newFd = { ...base, appointedSignature: b64, appointedSignedAt: new Date().toISOString() };
    updateMutation.mutate({ formData: newFd, status: newFd.directorSignature ? 'completed' : order!.status });
    setSigningAppointed(false);
  }

  const infoRows: [string, string][] = isFireSafety
    ? [
        ['ბრძანება №', fd.orderNumber],
        ['ქალაქი', fd.city],
        ['თარიღი', fd.orderDate ? new Date(fd.orderDate).toLocaleDateString('ka-GE') : '—'],
        ['კომპანია', fd.companyName],
        ['დირექტორი', fd.directorName],
        ['დანიშნული პირი', fd.appointedName],
        ['ტელეფონი', fd.appointedPhone],
        ['ობიექტი', fd.objectName],
        ['ობიექტის მისამართი', fd.objectAddress],
      ]
    : isFireSafetyEnterprise
    ? [
        ['ბრძანება №', fdEnterprise.orderNumber],
        ['ქალაქი', fdEnterprise.city],
        ['თარიღი', fdEnterprise.orderDate ? new Date(fdEnterprise.orderDate).toLocaleDateString('ka-GE') : '—'],
        ['კომპანია', fdEnterprise.companyName],
        ['დირექტორი', fdEnterprise.directorName],
        ['დანიშნული პირი', fdEnterprise.appointedName],
        ['თანამდებობა', fdEnterprise.appointedPosition],
        ['პ/ნ', fdEnterprise.appointedIdNumber],
        ['ტელეფონი', fdEnterprise.appointedPhone],
        ['ობიექტი', fdEnterprise.objectName],
        ['ობიექტის მისამართი', fdEnterprise.objectAddress],
      ]
    : order.documentType === 'labor_safety_specialist'
    ? [
        ['ბრძანება №', fdLabor.orderNumber],
        ['ქალაქი', fdLabor.city],
        ['თარიღი', fdLabor.orderDate ? new Date(fdLabor.orderDate).toLocaleDateString('ka-GE') : '—'],
        ['კომპანია', fdLabor.companyName],
        ['დირექტორი', fdLabor.directorName],
        ['სპეციალისტი', fdLabor.specialistName],
        ['სერტ. №', fdLabor.certificateNumber],
      ]
    : [
        ['ბრძანება №', fdAlcohol.orderNumber],
        ['ქალაქი', fdAlcohol.city],
        ['თარიღი', fdAlcohol.orderDate ? new Date(fdAlcohol.orderDate).toLocaleDateString('ka-GE') : '—'],
        ['კომპანია', fdAlcohol.companyName],
        ['დირექტორი', fdAlcohol.directorName],
        ['პასუხისმგებელი', fdAlcohol.responsiblePersonName],
      ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        {project && (
          <>
            <Link to={routes.projects.detail(project.id)} className="text-brand-600 hover:underline">
              {project.name}
            </Link>
            <span className="text-neutral-400">›</span>
          </>
        )}
        <Link to={routes.orders.list(projectId)} className="text-brand-600 hover:underline">
          ბრძანებები
        </Link>
        <span className="text-neutral-400">›</span>
        <span className="truncate max-w-[200px] text-neutral-500">
          {ORDER_DOCUMENT_TYPE_LABEL[order.documentType]}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {ORDER_DOCUMENT_TYPE_LABEL[order.documentType]}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(order.createdAt).toLocaleDateString('ka-GE')}
            {' · '}
            <span className={`font-medium ${order.status === 'completed' ? 'text-green-700' : 'text-amber-700'}`}>
              {order.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
            </span>
          </p>
        </div>
        <Button onClick={openPdf} className="gap-2 shrink-0">
          <FileText size={16} />
          PDF-ის ნახვა
        </Button>
      </div>

      {/* Info */}
      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {infoRows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-4 px-4 py-2.5 text-sm">
            <span className="w-36 shrink-0 text-neutral-500">{label}</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{value || '—'}</span>
          </div>
        ))}
      </div>

      {/* Signatures (fire safety variants only) */}
      {isFireSafetyVariant && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-neutral-800">ხელმოწერები</h2>

          {/* Director */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-800">
                დირექტორი — {fd.directorName || '—'}
              </span>
              {fd.directorSignature && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const base = isFireSafetyEnterprise ? fdEnterprise : fd;
                    updateMutation.mutate({ formData: { ...base, directorSignature: null, directorSignedAt: null } });
                  }}
                  className="text-neutral-400 hover:text-red-500"
                >
                  <RotateCcw size={14} />
                </Button>
              )}
            </div>
            {fd.directorSignature ? (
              <div className="flex items-center gap-3">
                <img
                  src={`data:image/png;base64,${fd.directorSignature}`}
                  alt="დირექტორის ხელმოწერა"
                  className="h-14 rounded border border-neutral-200 bg-white p-1"
                />
                <span className="text-xs text-green-700 font-medium">
                  ✓ {fd.directorSignedAt ? new Date(fd.directorSignedAt).toLocaleDateString('ka-GE') : ''}
                </span>
              </div>
            ) : signingDirector ? (
              <SignatureCanvas
                onSave={saveDirectorSig}
                onCancel={() => setSigningDirector(false)}
              />
            ) : (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setSigningDirector(true)}>
                <Pencil size={14} />
                + ხელმოწერა
              </Button>
            )}
          </div>

          {/* Appointed */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-800">
                დანიშნული პირი — {fd.appointedName || '—'}
              </span>
              {fd.appointedSignature && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const base = isFireSafetyEnterprise ? fdEnterprise : fd;
                    updateMutation.mutate({ formData: { ...base, appointedSignature: null, appointedSignedAt: null } });
                  }}
                  className="text-neutral-400 hover:text-red-500"
                >
                  <RotateCcw size={14} />
                </Button>
              )}
            </div>
            {fd.appointedSignature ? (
              <div className="flex items-center gap-3">
                <img
                  src={`data:image/png;base64,${fd.appointedSignature}`}
                  alt="დანიშნული პირის ხელმოწერა"
                  className="h-14 rounded border border-neutral-200 bg-white p-1"
                />
                <span className="text-xs text-green-700 font-medium">
                  ✓ {fd.appointedSignedAt ? new Date(fd.appointedSignedAt).toLocaleDateString('ka-GE') : ''}
                </span>
              </div>
            ) : signingAppointed ? (
              <SignatureCanvas
                onSave={saveAppointedSig}
                onCancel={() => setSigningAppointed(false)}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setSigningAppointed(true)}
                disabled={!fd.directorSignature}
                title={!fd.directorSignature ? 'ჯერ დირექტორმა უნდა მოაწეროს ხელი' : undefined}
              >
                <Pencil size={14} />
                + ხელმოწერა
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-red-800">ბრძანების წაშლა</p>
          <DeleteButton onDelete={() => deleteMutation.mutate()} isPending={deleteMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
