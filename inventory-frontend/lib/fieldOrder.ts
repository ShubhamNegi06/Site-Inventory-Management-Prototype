// Field keys in the exact order they appear as columns in the source
// template, used to sort fields within a section. Fields not listed here
// (custom/ad hoc ones someone added) sort after all canonical fields, in
// the order the API returned them.
export const FIELD_ORDER = [
  // Case Details
  "type-of-tissue",
  // Demographic Details
  "age",
  "gender",
  "ethnicity",
  "country-of-origin",
  // Diagnosis Information
  "biopsy-surgery",
  "diagnostic-procedure",
  "origin-site",
  "diagnosis-result",
  "grade",
  "stage",
  "t",
  "n",
  "m",
  // Sample Information
  "date-of-reporting",
  "fixation-used",
  "tumor-percent",
  "necrosis-percent",
  "storage-temperature",
  // Serology Report
  "hiv",
  "hbv",
  "hcv",
  // Treatment Detail
  "treatment-information",
  "neoadjuvant-treatment-details",
  // Biomarker Characterization
  "biomarker-details",
];

export function sortByFieldOrder<T extends { field_key: string }>(fields: T[]): T[] {
  return [...fields].sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(a.field_key);
    const bi = FIELD_ORDER.indexOf(b.field_key);
    if (ai === -1 && bi === -1) return 0;      // both custom -- keep relative order
    if (ai === -1) return 1;                    // custom fields sort after canonical ones
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function sortKeysByFieldOrder(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(a);
    const bi = FIELD_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}