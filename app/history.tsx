// Global History screen — type-filtered (Inspections | Reports | Brdzaneba |
// Incidents | Briefings), one type at a time, completed records only.
//
// Route file stays orchestration-only per the file-size rules; the screen body
// lives in features/history/ and the shared per-type building blocks in
// features/records/.
export { default } from '../features/history/HistoryScreen';
