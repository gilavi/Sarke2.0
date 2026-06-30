// Per-doc-type config for the რისკების შეფასება editor: which header fields and
// which signatory roles each document type collects.

import type { RADocType } from '../../types/riskAssessment';

export interface RAHeaderField {
  key: string;
  /** i18n key for the label. */
  labelKey: string;
  kind?: 'text' | 'date' | 'multiline';
}

export interface RASignatoryConfig {
  role: string;
  labelKey: string;
  /** Show an editable position field (e.g. for the HSE specialist). */
  withPosition?: boolean;
}

export const RA_HEADER_FIELDS: Record<RADocType, RAHeaderField[]> = {
  risk_assessment: [
    { key: 'objectName', labelKey: 'risk.objectName' },
    { key: 'assessorName', labelKey: 'risk.assessorName' },
    { key: 'date', labelKey: 'risk.date', kind: 'date' },
    { key: 'time', labelKey: 'risk.time' },
    { key: 'workDescription', labelKey: 'risk.workDescription', kind: 'multiline' },
  ],
  ppe_determination: [
    { key: 'companyName', labelKey: 'risk.companyName' },
    { key: 'objectName', labelKey: 'risk.objectNameId' },
    { key: 'address', labelKey: 'risk.address' },
    { key: 'hseSpecialist', labelKey: 'risk.hseSpecialist' },
  ],
};

export const RA_SIGNATORIES: Record<RADocType, RASignatoryConfig[]> = {
  risk_assessment: [
    { role: 'assessor', labelKey: 'risk.assessor' },
    { role: 'companyRep', labelKey: 'risk.companyRep' },
  ],
  ppe_determination: [
    { role: 'hse', labelKey: 'risk.hseSpecialist', withPosition: true },
    { role: 'director', labelKey: 'orders.directorLabel' },
  ],
};

/** Score select options 1..5 for probability / severity pickers. */
export const RA_SCORE_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));
