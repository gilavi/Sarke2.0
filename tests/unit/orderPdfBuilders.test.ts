import { describe, it, expect } from 'vitest';
import { buildLaborSafetyOrderHtml } from '../../lib/pdf/order/laborSafety';
import { buildAlcoholControlOrderHtml } from '../../lib/pdf/order/alcoholControl';
import { buildFireSafetyOrderHtml } from '../../lib/pdf/order/fireSafety';
import { buildFireSafetyOrderEnterpriseHtml } from '../../lib/pdf/order/fireSafetyEnterprise';
import { buildCraneOperatorOrderHtml } from '../../lib/pdf/order/craneOperator';
import { buildCraneTechnicalOrderHtml } from '../../lib/pdf/order/craneTechnical';
import { buildScaffoldSupervisionOrderHtml } from '../../lib/pdf/order/scaffoldSupervision';
import { buildTrainingScheduleOrderHtml } from '../../lib/pdf/order/trainingSchedule';
import { renderOrderPhoto, renderBlankSignatureRows } from '../../lib/pdf/order/_shared';
import type {
  LaborSafetyOrderFormData,
  AlcoholControlOrderFormData,
  FireSafetyOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  CraneOperatorOrderFormData,
  CraneTechnicalOrderFormData,
  ScaffoldSupervisionOrderFormData,
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
    objectAddress: 'რუსთაველის გამზ. 1',
    activityField: 'მშენებლობა',
  };
  const html = buildLaborSafetyOrderHtml({ formData: f, projectName: 'P' });

  it('produces a complete HTML document with the source body', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('შპს Acme');
    expect(html).toContain('გიორგი დ.');
    expect(html).toContain('ნიკოლოზ ს.');
    expect(html).toContain('მშენებლობა');                        // activity field
    expect(html).toContain('მე-7 მუხლი');                        // source legal basis
    expect(html).toContain('საქმიანობის სფერო');
  });

  it('drops the invented cert reference + duty list', () => {
    expect(html).not.toContain('CERT-001');                      // no certificate row
    expect(html).not.toContain('№381');                          // invented legal basis
    expect(html).not.toContain('HSE მენეჯერს');                  // invented clause
  });

  it('embeds success-screen director signature + extra rows', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    const out = buildLaborSafetyOrderHtml({
      formData: f,
      projectName: 'P',
      directorSignatureBase64: 'LDIR',
      extraSignatureRows: 2,
    });
    expect(out).toContain('data:image/png;base64,LDIR');
    expect(out.split(slot).length - 1).toBe(2);
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

  it('renders the source-of-truth legal basis + duties (ა–ი)', () => {
    expect(html).toContain('№370');                                 // legal basis
    expect(html).toContain('Permit to Work');                       // duty ვ
    expect(html).toContain('საგანგებო სიტუაციების მართვის სამსახურის (112)'); // duty ზ
    expect(html).toContain('ჰიდრანტები');                           // duty ი
    expect(html).toContain('ბრძანება ძალაში შედის ხელმოწერის დღიდან');
  });

  it('drops the invented (non-source) fire clauses', () => {
    expect(html).not.toContain('სახანძრო სავარჯიშოს');             // invented drill clause
    expect(html).not.toContain('შრომის უსაფრთხოების სამსახური');    // invented subhead
  });

  it('embeds success-screen signature args (director + extra rows)', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    const out = buildFireSafetyOrderHtml({
      formData: { ...f, directorSignature: null, appointedSignature: null },
      projectName: 'P',
      directorSignatureBase64: 'FDIR',
      extraSignatureRows: 2,
    });
    expect(out).toContain('data:image/png;base64,FDIR');
    expect(out.split(slot).length - 1).toBe(2);
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

  it('uses the source-accurate title and subtitle', () => {
    // "დირექტორის ბრძანება" with letter-spacing renders as spaced glyphs.
    expect(html).toContain('დ ი რ ე ქ ტ ო რ ი ს');
    expect(html).toContain('კოშკურა ამწის ოპერატორის დანიშვნისა და უსაფრთხო ექსპლუატაციის უზრუნველყოფის შესახებ');
  });

  it('renders the source-of-truth duties (ა–ი)', () => {
    expect(html).toContain('ძლიერი ქარი 10 მ/წ და ზემოთ');           // wind ≥10 m/s
    expect(html).toContain('პერსონალური დამცავი საშუალებების გარეშე'); // PPE clause
    expect(html).toContain('ვარდნისგან დამცავი ღვედის');             // fall-harness ≥2m
    expect(html).toContain('არ დაუშვას ადამიანების ყოფნა აწეული ტვირთის ქვეშ');
    expect(html).toContain('ბრძანება ძალაში შედის ხელმოწერის მომენტიდან');
  });

  it('drops the invented (non-source) clauses', () => {
    expect(html).not.toContain('საბაჟო');   // hallucinated "customs controls" clause
    expect(html).not.toContain('15 მ/წ');    // wrong wind threshold
    expect(html).not.toContain('ტექნიკური და სამშენებლო სამსახური'); // invented subhead
  });

  it('embeds certificate + inspection photos when data URLs are provided', () => {
    const withPhotos = buildCraneOperatorOrderHtml({
      formData: f,
      projectName: 'P',
      certPhotoDataUrl: 'data:image/jpeg;base64,CERTPHOTO',
      inspCertPhotoDataUrl: 'data:image/jpeg;base64,INSPPHOTO',
    });
    expect(withPhotos).toContain('data:image/jpeg;base64,CERTPHOTO');
    expect(withPhotos).toContain('data:image/jpeg;base64,INSPPHOTO');
    expect(withPhotos).toContain('სერტიფიკატის ფოტო');
    expect(withPhotos).toContain('ამწის ინსპექტირების სერთიფიკატი');
  });

  it('omits photo figures when no data URLs are provided', () => {
    // f has null photos and null signatures → no <img> at all.
    expect(html).not.toContain('<figure');
    expect(html).not.toContain('<img');
  });

  it('prints no extra hand-sign slots by default and N when requested', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    expect(html.split(slot).length - 1).toBe(0);
    const withRows = buildCraneOperatorOrderHtml({
      formData: { ...f, signatureExtraRows: 2 },
      projectName: 'P',
    });
    expect(withRows.split(slot).length - 1).toBe(2);
  });

  it('embeds the success-screen director signature + extra rows via args', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    const out = buildCraneOperatorOrderHtml({
      formData: f, // director/operator signatures null in form
      projectName: 'P',
      directorSignatureBase64: 'DIRECTORSIG',
      extraSignatureRows: 3,
    });
    expect(out).toContain('data:image/png;base64,DIRECTORSIG'); // director block
    expect(out.split(slot).length - 1).toBe(3);                  // extra blank slots
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

  it('uses source-accurate title, legal basis and duties (ა–ზ)', () => {
    expect(html).toContain('დ ი რ ე ქ ტ ო რ ი ს');
    expect(html).toContain('№429');                                  // legal basis
    expect(html).toContain('ელექტროძრავები, რედუქტორები');           // duty ა
    expect(html).toContain('Hook block');                            // duty გ
    expect(html).toContain('სტატიკური დატვირთვის გამოცდა');          // load test bullet
    expect(html).toContain('ბრძანება ძალაში შედის ხელმოწერის მომენტიდან');
  });

  it('drops the invented (non-source) technical clauses', () => {
    expect(html).not.toContain('ბრჭყალების');                        // invented parenthetical
    expect(html).not.toContain('ლებედკის');                          // invented winch term
    expect(html).not.toContain('ტექნიკური და სამშენებლო სამსახური');  // invented subhead
  });

  it('embeds photos + success-screen signature args', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    const out = buildCraneTechnicalOrderHtml({
      formData: f,
      projectName: 'P',
      certPhotoDataUrl: 'data:image/jpeg;base64,TCERT',
      inspCertPhotoDataUrl: 'data:image/jpeg;base64,TINSP',
      directorSignatureBase64: 'TDIRSIG',
      extraSignatureRows: 2,
    });
    expect(out).toContain('data:image/jpeg;base64,TCERT');
    expect(out).toContain('data:image/jpeg;base64,TINSP');
    expect(out).toContain('data:image/png;base64,TDIRSIG');
    expect(out.split(slot).length - 1).toBe(2);
  });
});

describe('buildScaffoldSupervisionOrderHtml', () => {
  const f: ScaffoldSupervisionOrderFormData = {
    orderNumber: '003',
    city: 'თბილისი',
    orderDate: '2026-05-20',
    companyName: 'შპს Acme',
    objectAddress: 'საქართველო, თბილისი',
    directorName: 'გიორგი დ.',
    appointedName: 'ზედამხედველი პ.',
    appointedPosition: 'ოსტატი',
    appointedPhone: '+995555111222',
    directorSignature: null,
    directorSignedAt: null,
    appointedSignature: null,
    appointedSignedAt: null,
  };
  const html = buildScaffoldSupervisionOrderHtml({ formData: f, projectName: 'P' });

  it('produces complete HTML with appointed supervisor + source duties', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('დ ი რ ე ქ ტ ო რ ი ს');
    expect(html).toContain('ზედამხედველი პ.');
    expect(html).toContain('ხარაჩოს პერიოდული ვიზუალური და ტექნიკური შემოწმება'); // duty ბ
    expect(html).toContain('კუსტარული ან არასტანდარტული დეტალებით');             // duty გ
    expect(html).toContain('ბრძანება ძალაში შედის ხელმოწერის მომენტიდან');
  });

  it('has no certificate / crane / photo blocks', () => {
    expect(html).not.toContain('სერტიფიკატის ნომერი');
    expect(html).not.toContain('ამწის');     // scaffolding doc — no crane refs
    expect(html).not.toContain('<figure');   // no photos
  });

  it('embeds success-screen signature args (director + extra rows)', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    const out = buildScaffoldSupervisionOrderHtml({
      formData: f,
      projectName: 'P',
      directorSignatureBase64: 'SDIR',
      extraSignatureRows: 2,
    });
    expect(out).toContain('data:image/png;base64,SDIR');
    expect(out.split(slot).length - 1).toBe(2);
  });
});

describe('buildTrainingScheduleOrderHtml', () => {
  const html = buildTrainingScheduleOrderHtml({
    formData: {
      orderDate: '2026-05-20',
      companyName: 'შპს Acme',
      directorName: 'გიორგი დ.',
      directorSignature: null,
      directorSignedAt: null,
    },
    projectName: 'P',
  });

  it('produces the static plan-schedule body', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('სწავლება-ინსტრუქტაჟის გეგმა-გრაფიკი');
    expect(html).toContain('შპს Acme');
    expect(html).toContain('გიორგი დ.');
    expect(html).toContain('არანაკლებ 3 თვეში ერთხელ');          // repeat clause
    expect(html).toContain('ერგონომიკ');                          // topic
  });

  it('embeds success-screen director signature + extra rows', () => {
    const slot = 'სახელი, გვარი: ___________________________';
    const out = buildTrainingScheduleOrderHtml({
      formData: {
        orderDate: '2026-05-20',
        companyName: 'შპს Acme',
        directorName: 'გიორგი დ.',
      },
      projectName: 'P',
      directorSignatureBase64: 'TRDIR',
      extraSignatureRows: 1,
    });
    expect(out).toContain('data:image/png;base64,TRDIR');
    expect(out.split(slot).length - 1).toBe(1);
  });
});

describe('renderOrderPhoto', () => {
  it('renders a captioned figure with the data URL', () => {
    const out = renderOrderPhoto('data:image/jpeg;base64,ABC', 'სერტიფიკატის ფოტო');
    expect(out).toContain('<figure');
    expect(out).toContain('src="data:image/jpeg;base64,ABC"');
    expect(out).toContain('სერტიფიკატის ფოტო');
    expect(out).toContain('page-break-inside:avoid');
  });

  it('returns an empty string for falsy input (safe to call unconditionally)', () => {
    expect(renderOrderPhoto(null, 'x')).toBe('');
    expect(renderOrderPhoto(undefined, 'x')).toBe('');
    expect(renderOrderPhoto('', 'x')).toBe('');
  });

  it('HTML-escapes the caption', () => {
    const out = renderOrderPhoto('data:image/png;base64,Z', '<b>"hi"</b>');
    expect(out).toContain('&lt;b&gt;&quot;hi&quot;&lt;/b&gt;');
    expect(out).not.toContain('<b>"hi"</b>');
  });
});

describe('renderBlankSignatureRows', () => {
  const slot = 'სახელი, გვარი: ___________________________';

  it('renders N labeled blank slots', () => {
    expect(renderBlankSignatureRows(3).split(slot).length - 1).toBe(3);
    expect(renderBlankSignatureRows(1)).toContain('ხელმოწერა');
  });

  it('renders nothing for 0, null, undefined, or negatives', () => {
    expect(renderBlankSignatureRows(0)).toBe('');
    expect(renderBlankSignatureRows(null)).toBe('');
    expect(renderBlankSignatureRows(undefined)).toBe('');
    expect(renderBlankSignatureRows(-5)).toBe('');
  });

  it('clamps to a sane maximum (20)', () => {
    expect(renderBlankSignatureRows(999).split(slot).length - 1).toBe(20);
  });
});
