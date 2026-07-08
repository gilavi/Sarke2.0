// Shared, context-neutral building blocks for the per-type record surfaces
// (Home widgets, History per-type lists, Drafts). See AGENTS.md.

export { getRecordStyles } from './styles';
export { RecordWidget } from './RecordWidget';
export { ReportRow } from './ReportRow';
export { BriefingRow } from './BriefingRow';
export { OrderRow } from './OrderRow';
export { ReportThumb } from './ReportThumb';
export { ReportCard, REPORT_CARD_WIDTH } from './ReportCard';
export { ReportCardRail } from './ReportCardRail';
export { ReportCardGrid } from './ReportCardGrid';
export { useReportCoverUri } from './useReportCover';
export { useReportDelete } from './useReportDelete';
export { BriefingTopicAvatar } from './BriefingTopicAvatar';
export { briefingTopicsLabel } from './topics';
export {
  RECORD_TYPES,
  RECORD_TYPE_KEYS,
  RECENT_COMPLETED_LIMIT,
  DEFAULT_RECORD_TYPE,
  isRecordTypeKey,
  recordTypeOf,
  historyHref,
} from './recordTypes';
export type { RecordTypeKey, RecordTypeDescriptor } from './recordTypes';
