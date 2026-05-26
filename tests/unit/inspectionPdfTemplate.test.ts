import { describe, it, expect } from 'vitest';
import { buildInspectionPdfTemplate } from '../../lib/pdf/inspection/template';
import type {
  Inspection,
  Template,
  Project,
  Question,
  Answer,
  AnswerPhoto,
  SignatureRecord,
  InspectionAttachment,
} from '../../types/models';

function mockTemplate(): Template {
  return {
    id: 't1',
    owner_id: null,
    name: 'ხარაჩოს შემოწმება',
    category: 'scaffold',
    is_system: true,
    required_qualifications: ['xaracho_inspector'],
    required_signer_roles: ['expert', 'xaracho_supervisor'],
  };
}

function mockProject(): Project {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'ობიექტი X',
    company_name: 'შპს Acme',
    address: 'თბილისი, საქართველო',
    latitude: null,
    longitude: null,
    crew: null,
    logo: null,
    contact_phone: null,
    created_at: '2026-05-20T09:00:00Z',
  };
}

function mockInspection(over: Partial<Inspection> = {}): Inspection {
  return {
    id: 'abcdef12-3456-7890-aaaa-bbbbccccdddd',
    project_id: 'p1',
    project_item_id: null,
    template_id: 't1',
    user_id: 'u1',
    status: 'completed',
    harness_name: null,
    conclusion_text: 'ყველაფერი წესრიგშია',
    is_safe_for_use: true,
    conclusion_photo_paths: [],
    created_at: '2026-05-20T10:00:00Z',
    completed_at: '2026-05-20T11:00:00Z',
    ...over,
  };
}

const questions: Question[] = [
  {
    id: 'q1',
    template_id: 't1',
    section: 1,
    order: 1,
    type: 'yesno',
    title: 'ხარაჩოს პასპორტი',
    min_val: null,
    max_val: null,
    unit: null,
    grid_rows: null,
    grid_cols: null,
  },
  {
    id: 'q2',
    template_id: 't1',
    section: 1,
    order: 2,
    type: 'measure',
    title: 'სიმაღლე',
    min_val: 0,
    max_val: 10,
    unit: 'მ',
    grid_rows: null,
    grid_cols: null,
  },
  {
    id: 'q3',
    template_id: 't1',
    section: 2,
    order: 1,
    type: 'freetext',
    title: 'შენიშვნები',
    min_val: null,
    max_val: null,
    unit: null,
    grid_rows: null,
    grid_cols: null,
  },
];

const answers: Answer[] = [
  {
    id: 'a1',
    inspection_id: 'i1',
    question_id: 'q1',
    value_bool: true,
    value_num: null,
    value_text: null,
    grid_values: null,
    comment: 'OK',
    notes: null,
  },
  {
    id: 'a2',
    inspection_id: 'i1',
    question_id: 'q2',
    value_bool: null,
    value_num: 5,
    value_text: null,
    grid_values: null,
    comment: null,
    notes: null,
  },
  {
    id: 'a3',
    inspection_id: 'i1',
    question_id: 'q3',
    value_bool: null,
    value_num: null,
    value_text: 'ყველაფერი წესრიგშია',
    grid_values: null,
    comment: null,
    notes: null,
  },
];

const photo: AnswerPhoto = {
  id: 'ph1',
  answer_id: 'a1',
  storage_path: 'answer-photos/i1/a1.jpg',
  caption: null,
  latitude: 41.7,
  longitude: 44.8,
  address: 'თბილისი, საქართველო',
  created_at: '2026-05-20T10:30:00Z',
};

const signatures: SignatureRecord[] = [
  {
    id: 's1',
    inspection_id: 'i1',
    signer_role: 'expert',
    full_name: 'გიორგი ხ.',
    phone: '+995555111222',
    position: 'ინჟინერი',
    signature_png_url: 'data:image/png;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5',
    signed_at: '2026-05-20T11:00:00Z',
    status: 'signed',
    person_name: null,
  },
];

describe('buildInspectionPdfTemplate', () => {
  const html = buildInspectionPdfTemplate({
    questionnaire: mockInspection(),
    template: mockTemplate(),
    project: mockProject(),
    questions,
    answers,
    signatures,
    photosByAnswer: { a1: [photo] },
    attachments: [],
  });

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders all question titles', () => {
    expect(html).toContain('ხარაჩოს პასპორტი');
    expect(html).toContain('სიმაღლე');
    expect(html).toContain('შენიშვნები');
  });

  it('renders the conclusion and report id', () => {
    expect(html).toContain('ყველაფერი წესრიგშია');
    expect(html).toContain('ABCDEF12');
  });

  it('renders project company name and address', () => {
    expect(html).toContain('შპს Acme');
    expect(html).toContain('თბილისი, საქართველო');
  });

  it('renders the signer name and signature image', () => {
    expect(html).toContain('გიორგი ხ.');
    expect(html).toContain('data:image/png;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5');
  });

  it('uses the first photo address as inspection location', () => {
    expect(html).toContain('თბილისი, საქართველო');
  });
});

describe('buildInspectionPdfTemplate — draft mode', () => {
  it('renders a draft inspection', () => {
    const html = buildInspectionPdfTemplate({
      questionnaire: mockInspection({ status: 'draft', completed_at: null }),
      template: mockTemplate(),
      project: mockProject(),
      questions,
      answers,
      signatures: [],
      mode: 'preview',
    });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});

describe('buildInspectionPdfTemplate — empty edges', () => {
  it('handles zero questions/answers/signatures', () => {
    const html = buildInspectionPdfTemplate({
      questionnaire: mockInspection(),
      template: mockTemplate(),
      project: mockProject(),
      questions: [],
      answers: [],
      signatures: [],
    });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('handles is_safe_for_use=false', () => {
    const html = buildInspectionPdfTemplate({
      questionnaire: mockInspection({ is_safe_for_use: false, conclusion_text: 'უსაფრთხო არ არის' }),
      template: mockTemplate(),
      project: mockProject(),
      questions,
      answers,
      signatures,
    });
    expect(html).toContain('უსაფრთხო არ არის');
  });

  it('renders attachments when provided', () => {
    const attachment: InspectionAttachment & { photo_data_url?: string } = {
      id: 'att1',
      inspection_id: 'i1',
      user_id: 'u1',
      cert_type: 'ხარაჩოს სერტიფიკატი',
      cert_number: 'CERT-001',
      photo_path: 'certificates/i1/att1.jpg',
      photo_data_url: 'data:image/jpeg;base64,ATTPHOTO',
      created_at: '2026-05-20T10:00:00Z',
      updated_at: '2026-05-20T10:00:00Z',
    };
    const html = buildInspectionPdfTemplate({
      questionnaire: mockInspection(),
      template: mockTemplate(),
      project: mockProject(),
      questions,
      answers,
      signatures,
      attachments: [attachment],
    });
    expect(html).toContain('CERT-001');
    expect(html).toContain('data:image/jpeg;base64,ATTPHOTO');
  });
});
