import { describe, it, expect } from 'vitest';
import { buildLaborSafetyOrderHtml } from '../../lib/pdf/order/laborSafety';
import { buildAlcoholControlOrderHtml } from '../../lib/pdf/order/alcoholControl';
import { buildFireSafetyOrderHtml } from '../../lib/pdf/order/fireSafety';
import { buildFireSafetyOrderEnterpriseHtml } from '../../lib/pdf/order/fireSafetyEnterprise';
import { buildCraneOperatorOrderHtml } from '../../lib/pdf/order/craneOperator';
import { buildCraneTechnicalOrderHtml } from '../../lib/pdf/order/craneTechnical';
import type {
  LaborSafetyOrderFormData,
  AlcoholControlOrderFormData,
  FireSafetyOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  CraneOperatorOrderFormData,
  CraneTechnicalOrderFormData,
} from '../../types/models';

describe('buildLaborSafetyOrderHtml', () => {
  const f: LaborSafetyOrderFormData = {
    orderNumber: '001',
    city: 'თბილისი',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    identificationCode: '404123456',
    legalAddress: 'რუსთაველის გამზ. 1',
    directorName: 'გიორგი დ.',
    facilityName: 'ობიექტი X',
    specialistName: 'ნიკოლოზ ს.',
    specialistPersonalId: '01234567890',
    certificateNumber: 'CERT-001',
    certificateDate: '2025-01-15',
  };
  const html = buildLaborSafetyOrderHtml({ formData: f, projectName: 'P' });

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('renders order number, company, and specialist', () => {
    expect(html).toContain('№001');
    expect(html).toContain('შპს Acme');
    expect(html).toContain('გიორგი დ.');
    expect(html).toContain('ნიკოლოზ ს.');
    expect(html).toContain('CERT-001');
  });
});

describe('buildAlcoholControlOrderHtml', () => {
  const f: AlcoholControlOrderFormData = {
    orderNumber: '002',
    city: 'ბათუმი',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    identificationCode: '404123456',
    legalAddress: 'რუსთაველის გამზ. 2',
    directorName: 'გიორგი დ.',
    facilityName: 'ობიექტი X',
    responsiblePersonName: 'რესპონს. პერსონა',
    responsiblePersonPosition: 'ინჟინერი',
    responsiblePersonPersonalId: '01234567890',
  };
  const html = buildAlcoholControlOrderHtml({ formData: f, projectName: 'P' });

  it('produces complete HTML with key fields', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('№002');
    expect(html).toContain('რესპონს. პერსონა');
  });
});

describe('buildFireSafetyOrderHtml', () => {
  const f: FireSafetyOrderFormData = {
    orderNumber: '003',
    city: 'თბილისი',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    identificationCode: '404123456',
    legalAddress: 'რუსთაველის გამზ. 3',
    directorName: 'გიორგი დ.',
    appointedName: 'სახანძრო პერსონა',
    appointedPhone: '+995555111222',
    objectName: 'ობიექტი X',
    objectAddress: 'საქართველო, თბილისი',
    directorSignature: 'DIRSIG',
    directorSignedAt: '2026-05-20',
    appointedSignature: 'APPSIG',
    appointedSignedAt: '2026-05-20',
  };
  const html = buildFireSafetyOrderHtml({ formData: f, projectName: 'P' });

  it('produces complete HTML and embeds signatures', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('სახანძრო პერსონა');
    expect(html).toContain('DIRSIG');
    expect(html).toContain('APPSIG');
  });

  it('handles missing signatures', () => {
    const html2 = buildFireSafetyOrderHtml({
      formData: { ...f, directorSignature: null, appointedSignature: null },
      projectName: 'P',
    });
    expect(html2.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});

describe('buildFireSafetyOrderEnterpriseHtml', () => {
  const f: FireSafetyOrderEnterpriseFormData = {
    orderNumber: '004',
    city: 'თბილისი',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    identificationCode: '404123456',
    legalAddress: 'რუსთაველის გამზ. 4',
    directorName: 'გიორგი დ.',
    appointedName: 'სახანძრო პერსონა',
    appointedPhone: '+995555111222',
    appointedPosition: 'ინჟინერი',
    appointedIdNumber: '01234567890',
    objectName: 'ობიექტი X',
    objectAddress: 'საქართველო, თბილისი',
    directorSignature: null,
    directorSignedAt: null,
    appointedSignature: null,
    appointedSignedAt: null,
  };
  const html = buildFireSafetyOrderEnterpriseHtml({ formData: f, projectName: 'P' });

  it('produces complete HTML', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('№004');
    expect(html).toContain('ინჟინერი');
  });
});

describe('buildCraneOperatorOrderHtml', () => {
  const f: CraneOperatorOrderFormData = {
    orderNumber: '005',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    objectAddress: 'საქართველო, თბილისი',
    directorName: 'გიორგი დ.',
    craneOperatorName: 'ოპერატორი',
    craneOperatorPersonalId: '01234567890',
    craneOperatorPosition: 'ამწის ოპერატორი',
    craneOperatorCertNumber: 'OP-001',
    craneOperatorCertExpiry: '2030-12-31',
    craneOperatorPhone: '+995555111222',
    craneOperatorCertPhoto: null,
    craneModel: 'Liebherr LTM-1100',
    craneNumber: 'CR-001',
    craneMaxLoad: '100t',
    craneInspCertPhoto: null,
    directorSignature: null,
    directorSignedAt: null,
    operatorSignature: null,
    operatorSignedAt: null,
  };
  const html = buildCraneOperatorOrderHtml({ formData: f, projectName: 'P' });

  it('produces complete HTML with crane info', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('Liebherr LTM-1100');
    expect(html).toContain('CR-001');
    expect(html).toContain('100t');
    expect(html).toContain('ოპერატორი');
  });
});

describe('buildCraneTechnicalOrderHtml', () => {
  const f: CraneTechnicalOrderFormData = {
    orderNumber: '006',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    objectAddress: 'საქართველო, თბილისი',
    directorName: 'გიორგი დ.',
    craneOperatorName: 'ოპერატორი',
    craneOperatorPersonalId: '01234567890',
    craneOperatorQualification: 'ამწის სპეციალისტი',
    craneOperatorCertNumber: 'OP-002',
    craneOperatorCertExpiry: '2030-12-31',
    craneOperatorPhone: '+995555111222',
    craneOperatorCertPhoto: null,
    craneModel: 'Liebherr LTM-1100',
    craneNumber: 'CR-002',
    craneMaxLoad: '50t',
    craneInspCertPhoto: null,
    directorSignature: null,
    directorSignedAt: null,
    operatorSignature: null,
    operatorSignedAt: null,
  };
  const html = buildCraneTechnicalOrderHtml({ formData: f, projectName: 'P' });

  it('produces complete HTML with operator qualification', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('№006');
    expect(html).toContain('ამწის სპეციალისტი');
  });
});
