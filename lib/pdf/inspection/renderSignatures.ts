import type { SignatureRecord, SignerRole } from '../../../types/models';
import { SIGNER_ROLE_LABEL } from '../../../types/models';
import { escapeHtml, tPdf } from './_shared';

export function renderSignatures(signatures: SignatureRecord[]): string {
  const validSig = /^data:image\/\w+;base64,.{32,}$/;
  const renderable = signatures.filter(
    sig =>
      sig.status === 'signed' &&
      !!sig.signature_png_url &&
      validSig.test(sig.signature_png_url),
  );

  const ordered = [
    ...renderable.filter(s => s.signer_role === 'expert'),
    ...renderable.filter(s => s.signer_role !== 'expert'),
  ];

  return ordered
    .map(sig => {
      const role = sig.signer_role;
      const label = !role
        ? 'ხელმომწერი'
        : role === 'expert'
        ? tPdf('pdf.expertLabel') ?? 'Expert'
        : (tPdf(`roles.${role.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`) ?? SIGNER_ROLE_LABEL[role as SignerRole] ?? role);
      const signedDate = sig.signed_at
        ? new Date(sig.signed_at).toLocaleDateString('ka-GE')
        : '';
      const signedTime = sig.signed_at
        ? new Date(sig.signed_at).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })
        : '';

      const auditParts: string[] = [];
      if (signedDate) auditParts.push(`<strong>${tPdf('pdf.timeLabel')}:</strong> ${signedDate} ${signedTime}`);
      if (sig.latitude != null && sig.longitude != null) {
        auditParts.push(`<strong>${tPdf('pdf.locationLabel')}:</strong> ${sig.latitude.toFixed(5)}, ${sig.longitude.toFixed(5)}`);
      }
      if (sig.device_id_hash) {
        auditParts.push(`<strong>${tPdf('pdf.deviceLabel')}:</strong> ${escapeHtml(sig.device_id_hash.slice(0, 8))}…`);
      }
      if (sig.ip_address) {
        auditParts.push(`<strong>IP:</strong> ${escapeHtml(sig.ip_address)}`);
      }
      const auditHtml = auditParts.length
        ? `<div class="audit-trail">${auditParts.join(' · ')}</div>`
        : '';

      return `
      <div class="sig-block${sig.signer_role === 'expert' ? ' is-expert' : ''}">
        <div class="sig-name">${escapeHtml(sig.full_name || '—')}</div>
        <div class="sig-role">${escapeHtml(label)}</div>
        ${sig.position ? `<div class="sig-position">${escapeHtml(sig.position)}</div>` : ''}
        <div class="sig-img-box">
          <img src="${escapeHtml(sig.signature_png_url ?? '')}" alt="${escapeHtml(tPdf('pdf.signatureAlt') ?? 'Signature')}" />
        </div>
        ${signedDate ? `<div class="sig-date">${escapeHtml(signedDate)}</div>` : ''}
        ${auditHtml}
      </div>`;
    })
    .join('');
}
