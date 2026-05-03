import type { Project, Report, ReportSlide } from '../types/models';

interface ReportPdfArgs {
  report: Report;
  project: Project | null;
  inspectorName: string;
  /** image_path → data URL, for the slide that has an image. Missing keys render
   *  the slide without an image. */
  slideImageDataUrls: Record<string, string>;
}

const KA_MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${KA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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

function renderSlide(slide: ReportSlide, idx: number, imageUrl: string | undefined): string {
  const num = idx + 1;
  const title = escapeHtml(slide.title || `სლაიდი ${num}`);
  const description = escapeHtml(slide.description || '');
  const hasImage = !!imageUrl;
  const hasDescription = description.length > 0;

  // Slide with only image (no description): image full-width, title centered below.
  if (hasImage && !hasDescription) {
    return `
      <section class="slide">
        <div class="slide-header">
          <span class="slide-num">${num}</span>
        </div>
        <img class="slide-image-full" src="${imageUrl}" alt="" />
        <h3 class="slide-title-centered">${title}</h3>
      </section>
    `;
  }

  // Text-only slide: full-width text.
  if (!hasImage) {
    return `
      <section class="slide">
        <div class="slide-header">
          <span class="slide-num">${num}</span>
          <h3 class="slide-title">${title}</h3>
        </div>
        ${
          hasDescription
            ? `<p class="slide-description full-width">${description}</p>`
            : ''
        }
      </section>
    `;
  }

  // Standard: 55% description left, 40% image right, 5% gap.
  return `
    <section class="slide">
      <div class="slide-header">
        <span class="slide-num">${num}</span>
        <h3 class="slide-title">${title}</h3>
      </div>
      <div class="slide-body">
        <div class="slide-text">
          <p class="slide-description">${description}</p>
        </div>
        <div class="slide-media">
          <img class="slide-image" src="${imageUrl}" alt="" />
        </div>
      </div>
    </section>
  `;
}

export function buildReportPdfHtml(args: ReportPdfArgs): string {
  const { report, project, inspectorName, slideImageDataUrls } = args;
  const slidesSorted = report.slides.slice().sort((a, b) => a.order - b.order);
  const projectName = project?.name ?? '';
  const dateStr = formatDate(report.created_at);
  const reportTitle = escapeHtml(report.title);

  const slidesHtml = slidesSorted
    .map((s, i) => {
      const path = s.annotated_image_path ?? s.image_path;
      const url = path ? slideImageDataUrls[path] : undefined;
      return renderSlide(s, i, url);
    })
    .join('<hr class="slide-divider" />');

  const initials = projectInitials(projectName);
  const footerLine = `SARKE · ${reportTitle} · ${dateStr}${projectName ? ` · ${escapeHtml(projectName)}` : ''}`;

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
    border-bottom: 3px solid #147A4F;
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
    background: #147A4F;
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
    color: #0C4930;
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
    background: #147A4F;
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
    max-height: 200px;
    object-fit: cover;
    border-radius: 6px;
    display: block;
  }
  .slide-image-full {
    width: 100%;
    max-height: 320px;
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
