export interface SafetyTip {
  id: string;
  title: string;
  category: 'hazard' | 'ppe' | 'procedure' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  shortDescription: string;
  fullDescription: string;
  checklist: string[];
  regulations: string[];
}
