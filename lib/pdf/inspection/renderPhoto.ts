import type { AnswerPhoto } from '../../../types/models';
import { escapeHtml, formatDate } from './_shared';

export function renderPhoto(
  photo: AnswerPhoto,
  isFailed: boolean,
  questionTitle: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const titlePart = escapeHtml(questionTitle.slice(0, 50));
  const timePart = photo.created_at ? formatDate(photo.created_at) : '';
  const captionText = timePart ? `${titlePart} - ${timePart}` : titlePart;

  const isRowCaption = photo.caption?.startsWith('row:') ?? false;
  // Prefer the dedicated address column; fall back to legacy addr: caption prefix.
  const addrText = (photo as any).address ?? (photo.caption?.startsWith('addr:') ? photo.caption.slice(5) : null);

  let noteCaption = '';
  if (addrText) {
    noteCaption = `<div class="photo-caption photo-location">გადაღებულია: ${escapeHtml(addrText)}</div>`;
  } else if (!isRowCaption && photo.caption) {
    noteCaption = `<div class="photo-caption">${escapeHtml(photo.caption)}</div>`;
  }

  const src = photo.storage_path;
  const isDataUrl = src.startsWith('data:');
  const isLocalFile = /^(file|content|ph|asset):\/\//.test(src);
  const isRemoteUrl = /^https?:\/\//.test(src);

  if (!isDataUrl && !isLocalFile && !isRemoteUrl) {
    return `<div class="photo-item${isFailed ? ' failed' : ''}">
      <div class="photo-img-wrap">
        <div class="photo-missing">${t('pdf.imageUnavailable')}</div>
      </div>
      <div class="photo-caption">${captionText}</div>
      ${noteCaption}
    </div>`;
  }

  return `<div class="photo-item${isFailed ? ' failed' : ''}">
    <div class="photo-img-wrap">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(t('pdf.photoAlt'))}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${escapeHtml(t('pdf.imageUnavailable'))}</div>';" />
    </div>
    <div class="photo-caption">${captionText}</div>
    ${noteCaption}
  </div>`;
}
