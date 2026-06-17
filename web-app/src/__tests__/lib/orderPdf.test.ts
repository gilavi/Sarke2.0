import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  openOrderPdfPreview,
  buildFireSafetyOrderHtml,
  buildFireSafetyOrderEnterpriseHtml,
  buildLaborSafetyOrderHtml,
  buildAlcoholControlOrderHtml,
} from '@/lib/orderPdf';
import type {
  FireSafetyOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  LaborSafetyOrderFormData,
  AlcoholControlOrderFormData,
} from '@/lib/data/orders';

const fireSafety = (over: Partial<FireSafetyOrderFormData> = {}): FireSafetyOrderFormData => ({
  orderNumber: '12',
  city: 'თბილისი',
  orderDate: '2026-05-01T00:00:00.000Z',
  companyName: 'შპს ალფა',
  identificationCode: '404123456',
  legalAddress: 'ვაჟა-ფშაველას 1',
  directorName: 'გ. ხელაძე',
  appointedName: 'ნ. ნოზაძე',
  appointedPhone: '599112233',
  objectName: 'საწყობი A',
  objectAddress: 'რუსთავი',
  directorSignature: null,
  directorSignedAt: null,
  appointedSignature: null,
  appointedSignedAt: null,
  ...over,
});

const enterprise = (over: Partial<FireSafetyOrderEnterpriseFormData> = {}): FireSafetyOrderEnterpriseFormData => ({
  ...fireSafety(),
  appointedPosition: 'ინჟინერი',
  appointedIdNumber: '01001000000',
  ...over,
});

const labor = (over: Partial<LaborSafetyOrderFormData> = {}): LaborSafetyOrderFormData => ({
  orderNumber: '7',
  city: 'ბათუმი',
  orderDate: '2026-05-01T00:00:00.000Z',
  companyName: 'შპს ბეტა',
  identificationCode: '405000111',
  legalAddress: 'ჭავჭავაძის 5',
  directorName: 'დ. დათაშვილი',
  facilityName: 'ობიექტი B',
  specialistName: 'ს. სპეციალისტი',
  specialistPersonalId: '60001000001',
  certificateNumber: 'CERT-99',
  certificateDate: '2025-01-15T00:00:00.000Z',
  ...over,
});

const alcohol = (over: Partial<AlcoholControlOrderFormData> = {}): AlcoholControlOrderFormData => ({
  orderNumber: '3',
  city: 'ქუთაისი',
  orderDate: '2026-05-01T00:00:00.000Z',
  companyName: 'შპს გამა',
  identificationCode: '406222333',
  legalAddress: 'თამარ მეფის 9',
  directorName: 'ი. ირემაძე',
  facilityName: 'ობიექტი C',
  responsiblePersonName: 'რ. რესპონდენტი',
  responsiblePersonPosition: 'ბრიგადირი',
  responsiblePersonPersonalId: '12345678901',
  ...over,
});

describe('orderPdf - escHtml (via builders)', () => {
  it('escapes HTML-significant chars in user input so injected markup is inert', () => {
    const html = buildFireSafetyOrderHtml(fireSafety({ companyName: '<script>alert("x")</script>' }));
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;');
    expect(html).not.toContain('<script>alert');
  });

  it('escapes & < > " across every builder', () => {
    const payload = `A&B <c> "d"`;
    const outputs = [
      buildFireSafetyOrderHtml(fireSafety({ companyName: payload })),
      buildFireSafetyOrderEnterpriseHtml(enterprise({ companyName: payload })),
      buildLaborSafetyOrderHtml(labor({ companyName: payload })),
      buildAlcoholControlOrderHtml(alcohol({ companyName: payload })),
    ];
    for (const html of outputs) {
      expect(html).toContain('A&amp;B');
      expect(html).toContain('&lt;c&gt;');
      expect(html).toContain('&quot;d&quot;');
      expect(html).not.toContain('A&B <c>');
    }
  });
});

describe('orderPdf - fmtDate (via builders)', () => {
  it('renders a blank placeholder when the order date is null', () => {
    const html = buildFireSafetyOrderHtml(fireSafety({ orderDate: null as unknown as string }));
    expect(html).toContain('___________');
  });

  it('formats a provided order date (contains the year)', () => {
    const html = buildFireSafetyOrderHtml(fireSafety({ orderDate: '2026-05-01T00:00:00.000Z' }));
    expect(html).toContain('2026');
    expect(html).toContain('წ.');
  });
});

describe('orderPdf - signature rendering', () => {
  it('renders an <img> for a present base64 signature', () => {
    const html = buildFireSafetyOrderHtml(fireSafety({ directorSignature: 'AAAABBBBCCCC' }));
    expect(html).toContain('data:image/png;base64,AAAABBBBCCCC');
    expect(html).toContain('<img');
  });

  it('renders an underline placeholder when a signature is null', () => {
    const html = buildFireSafetyOrderHtml(fireSafety({ directorSignature: null, appointedSignature: null }));
    expect(html).toContain('sig-underline');
  });
});

describe('buildFireSafetyOrderHtml', () => {
  it('produces a full HTML document with the core fields', () => {
    const html = buildFireSafetyOrderHtml(fireSafety());
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
    expect(html).toContain('შპს ალფა');
    expect(html).toContain('ნ. ნოზაძე');
    expect(html).toContain('საწყობი A');
    expect(html).toContain('ბრძანება №12');
  });

  it('includes objectAddress only when provided', () => {
    expect(buildFireSafetyOrderHtml(fireSafety({ objectAddress: 'რუსთავი' }))).toContain('რუსთავი');
    expect(buildFireSafetyOrderHtml(fireSafety({ objectAddress: '' }))).not.toContain('რუსთავი');
  });
});

describe('buildFireSafetyOrderEnterpriseHtml', () => {
  it('includes the enterprise-only fields and the №477 legal clause', () => {
    const html = buildFireSafetyOrderEnterpriseHtml(enterprise());
    expect(html).toContain('ინჟინერი');
    expect(html).toContain('01001000000');
    expect(html).toContain('№477');
    expect(html).toContain('საწარმო');
  });

  it('differs from the basic fire-safety order (basic has no №477 clause)', () => {
    expect(buildFireSafetyOrderHtml(fireSafety())).not.toContain('№477');
  });
});

describe('buildLaborSafetyOrderHtml', () => {
  it('includes specialist + certificate details', () => {
    const html = buildLaborSafetyOrderHtml(labor());
    expect(html).toContain('ს. სპეციალისტი');
    expect(html).toContain('60001000001');
    expect(html).toContain('CERT-99');
    expect(html).toContain('ბრძანება №7');
    expect(html).toContain('სპეციალისტის დანიშვნის შესახებ');
  });
});

describe('buildAlcoholControlOrderHtml', () => {
  it('includes the responsible person and the zero-tolerance policy', () => {
    const html = buildAlcoholControlOrderHtml(alcohol());
    expect(html).toContain('რ. რესპონდენტი');
    expect(html).toContain('ბრიგადირი');
    expect(html).toContain('ნულოვანი ტოლერანტობის');
    expect(html).toContain('ბრძანება №3');
  });
});

describe('openOrderPdfPreview', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a new window and writes the HTML into it', () => {
    const write = vi.fn();
    const close = vi.fn();
    const fakeWin = { document: { write, close } } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin);

    openOrderPdfPreview('<html>doc</html>');

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'noopener,noreferrer');
    expect(write).toHaveBeenCalledWith('<html>doc</html>');
    expect(close).toHaveBeenCalled();
  });

  it('does not throw when the popup is blocked (window.open returns null)', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(() => openOrderPdfPreview('<html>doc</html>')).not.toThrow();
  });
});
