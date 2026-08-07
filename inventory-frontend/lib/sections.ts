// Matches the section headers in the sample template exactly, so the form
// groups fields the same way the source spreadsheet does. Any field
// registered under a section name not in this list still renders fine --
// it just gets its own card after these, in whatever order it was created.
export const SECTION_ORDER = [
  "Case Details",
  "Demographic Details",
  "Diagnosis Information",
  "Sample Information",
  "Serology Report",
  "Treatment Detail",
  "Biomarker Characterization",
] as const;