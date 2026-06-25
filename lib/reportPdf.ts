import type { Project, Report, ReportSlide } from '../types/models';
import { KA_MONTH_FULL } from './homeUtils';
import { slideImagePath, slideImages, slideLayout } from './reportSlides';

interface ReportPdfArgs {
  report: Report;
  project: Project | null;
  inspectorName: string;
  /** storage path → data URL, for every embedded slide photo. Missing keys render
   *  the slide without that image. */
  slideImageDataUrls: Record<string, string>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${KA_MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function projectInitials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function renderSlide(slide: ReportSlide, idx: number, urls: Record<string, string>): string {
  const num = idx + 1;
  const title = escapeHtml(slide.title || `სლაიდი ${num}`);
  const description = escapeHtml(slide.description || '');
  const hasDescription = description.length > 0;

  // Resolve every photo on the slide to its embedded data URL, dropping any that
  // failed to embed (so a 2-photo slide with one bad image degrades to 1-photo).
  const imageUrls = slideImages(slide)
    .map(im => {
      const p = slideImagePath(im);
      return p ? urls[p] : undefined;
    })
    .filter((u): u is string => !!u);
  const layout = slideLayout(slide);

  const header = `
        <div class="slide-header">
          <span class="slide-num">${num}</span>
          <h3 class="slide-title">${title}</h3>
        </div>`;

  // Text-only slide: full-width text.
  if (imageUrls.length === 0) {
    return `
      <section class="slide">
        ${header}
        ${hasDescription ? `<p class="slide-description full-width">${description}</p>` : ''}
      </section>
    `;
  }

  // Two photos: description full-width on top, photos side by side or stacked.
  if (imageUrls.length >= 2) {
    const [a, b] = imageUrls;
    const grid =
      layout === 'two-stacked'
        ? `<div class="slide-stack">
             <img class="slide-image-stacked" src="${a}" alt="" />
             <img class="slide-image-stacked" src="${b}" alt="" />
           </div>`
        : `<div class="slide-duo">
             <img class="slide-image-duo" src="${a}" alt="" />
             <img class="slide-image-duo" src="${b}" alt="" />
           </div>`;
    return `
      <section class="slide">
        ${header}
        ${hasDescription ? `<p class="slide-description full-width">${description}</p>` : ''}
        ${grid}
      </section>
    `;
  }

  // One photo, no description: image full-width, title centered below (also the
  // 'photo-full' look). Preserves the historical image-only slide layout.
  if (!hasDescription || layout === 'photo-full') {
    return `
      <section class="slide">
        <div class="slide-header">
          <span class="slide-num">${num}</span>
        </div>
        <img class="slide-image-full" src="${imageUrls[0]}" alt="" />
        <h3 class="slide-title-centered">${title}</h3>
        ${hasDescription ? `<p class="slide-description full-width">${description}</p>` : ''}
      </section>
    `;
  }

  // One photo + description ('text-photo'): 55% description left, 40% image right.
  return `
    <section class="slide">
      ${header}
      <div class="slide-body">
        <div class="slide-text">
          <p class="slide-description">${description}</p>
        </div>
        <div class="slide-media">
          <img class="slide-image" src="${imageUrls[0]}" alt="" />
        </div>
      </div>
    </section>
  `;
}

export function buildReportPdfHtml(args: ReportPdfArgs): string {
  const { report, project, inspectorName, slideImageDataUrls } = args;
  const slidesSorted = report.slides.slice().sort((a, b) => a.order - b.order);
  const projectName = project?.company_name || project?.name || '';
  const dateStr = formatDate(report.created_at);
  const reportTitle = escapeHtml(report.title);

  const slidesHtml = slidesSorted
    .map((s, i) => renderSlide(s, i, slideImageDataUrls))
    .join('<hr class="slide-divider" />');

  const initials = projectInitials(projectName);
  const footerLine = `HUBBLE · ${reportTitle} · ${dateStr}${projectName ? ` · ${escapeHtml(projectName)}` : ''}`;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8" />
<title>${reportTitle}</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 22mm 16mm;
    @bottom-center {
      content: "${footerLine.replace(/"/g, '\\"')}";
      font-size: 9px;
      color: #A8A49C;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    color: #1A1A1A;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .header {
    border-bottom: 3px solid #FF5A1F;
    padding-bottom: 14px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .header-logo {
    width: 56px;
    height: 56px;
    border-radius: 10px;
    background: #C4350A;
    color: #fff;
    font-size: 22px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .header-text { flex: 1; min-width: 0; }
  .header-project {
    font-size: 12px;
    color: #7C7870;
    font-weight: 600;
    margin: 0 0 2px 0;
  }
  .header-title {
    font-size: 22px;
    font-weight: 800;
    color: #BE380C;
    margin: 0 0 4px 0;
    letter-spacing: -0.3px;
  }
  .header-meta {
    font-size: 11px;
    color: #7C7870;
    margin: 0;
  }
  .slide {
    page-break-inside: avoid;
    margin-bottom: 24px;
  }
  .slide-divider {
    border: none;
    border-top: 1px solid #E8E6E0;
    margin: 0 0 24px 0;
  }
  .slide-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .slide-num {
    width: 22px;
    height: 22px;
    border-radius: 11px;
    background: #C4350A;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .slide-title {
    font-size: 16px;
    font-weight: 700;
    color: #1A1A1A;
    margin: 0;
    flex: 1;
  }
  .slide-title-centered {
    font-size: 14px;
    font-weight: 700;
    color: #1A1A1A;
    text-align: center;
    margin: 10px 0 0 0;
  }
  .slide-body {
    display: flex;
    gap: 5%;
    align-items: flex-start;
  }
  .slide-text { width: 55%; }
  .slide-media { width: 40%; }
  .slide-description {
    font-size: 11px;
    color: #4B5563;
    line-height: 1.6;
    margin: 0;
    white-space: pre-wrap;
  }
  .slide-description.full-width { width: 100%; }
  .slide-image {
    width: 100%;
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }
  .slide-image-full {
    width: 100%;
    max-width: 100%;
    max-height: 320px;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }
  .slide-duo {
    display: flex;
    gap: 4%;
    align-items: flex-start;
    margin-top: 4px;
  }
  .slide-image-duo {
    width: 48%;
    max-width: 48%;
    max-height: 220px;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }
  .slide-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }
  .slide-image-stacked {
    width: 100%;
    max-width: 100%;
    max-height: 230px;
    object-fit: contain;
    border-radius: 6px;
    display: block;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-logo">${escapeHtml(initials)}</div>
    <div class="header-text">
      ${projectName ? `<p class="header-project">${escapeHtml(projectName)}</p>` : ''}
      <h1 class="header-title">${reportTitle}</h1>
      <p class="header-meta">${dateStr}${inspectorName ? ` · ${escapeHtml(inspectorName)}` : ''}</p>
    </div>
  </div>

  ${slidesHtml || '<p style="color:#7C7870;">სლაიდები არ არის</p>'}
</body>
</html>`;
}
