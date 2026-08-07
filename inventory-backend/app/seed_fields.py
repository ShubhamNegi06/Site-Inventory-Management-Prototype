"""
Brings the "static" field set in line with the latest sample template, and
migrates field keys to the sanitized kebab-case convention (the field_key
is what's actually stored in the database / JSONB; field_label is the
plain-English text shown everywhere in the UI -- these are intentionally
different so the stored key can be a stable, sanitized identifier even if
someone later tweaks the display label).

Example: "Country Of Origin" (label, shown to users) -> "country-of-origin"
(field_key, what's actually in the database).

This is safe to re-run:
  - Fields you already created that just need their key/label sanitized
    (e.g. old "country_of_origin" -> "country-of-origin") are renamed IN
    PLACE, and any sample data already stored under the old key is moved
    to the new key -- nothing is lost.
  - Fields that already match the canonical definition are left alone.
  - Fields that don't exist yet are created.

One exception: "date_of_biopsy_surgery" (a date, from an earlier template)
is NOT auto-renamed to "biopsy-surgery" (a Biopsy/Surgery category field in
the current template) because they hold fundamentally different kinds of
values -- auto-migrating would corrupt data. Both fields are left in place;
remove the old one by hand (via the "Remove field" button on the site) once
you've confirmed nothing depends on it.

Run:
    uv run python -m app.seed_fields
"""
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.field_definition import FieldDefinition, FieldType

# old field_key -> new field_key. Only safe, same-meaning renames go here.
RENAMES = {
    "diagnostic_procedure": "diagnostic-procedure",
    "origin_site": "origin-site",
    "diagnosis_result": "diagnosis-result",
    "figo_stage": "stage",                        # "FIGO Stage" -> "Stage" in the latest template
    "fixation_used": "fixation-used",
    "tumor_percent": "tumor-percent",
    "necrosis_percent": "necrosis-percent",
    "sample_storage": "storage-temperature",       # "Sample Storage" -> "Storage Temperature"
    "treatment_information": "treatment-information",
    "biomarker_details": "biomarker-details",
    "type_of_tissue": "type-of-tissue",
    "country_of_origin": "country-of-origin",
}

# (field_key, label, type, section, options)
CANONICAL_FIELDS = [
    ("type-of-tissue", "Type of Tissue", FieldType.select, "Case Details", "Tumor, NAT, Normal, Adjacent Normal"),

    ("age", "Age", FieldType.number, "Demographic Details", None),
    ("gender", "Gender", FieldType.select, "Demographic Details", "Male, Female, Transgender, Other"),
    ("ethnicity", "Ethnicity", FieldType.text, "Demographic Details", None),
    ("country-of-origin", "Country Of Origin", FieldType.select, "Demographic Details", "India, USA, UK, Canada, Australia, Other"),

    ("biopsy-surgery", "Biopsy/Surgery", FieldType.select, "Diagnosis Information", "Biopsy, Surgery"),
    ("diagnostic-procedure", "Diagnostic Procedure", FieldType.text, "Diagnosis Information", None),
    ("origin-site", "Origin Site", FieldType.text, "Diagnosis Information", None),
    ("diagnosis-result", "Diagnosis Result", FieldType.text, "Diagnosis Information", None),
    ("grade", "Grade", FieldType.text, "Diagnosis Information", None),
    ("stage", "Stage", FieldType.text, "Diagnosis Information", None),
    ("t", "T", FieldType.text, "Diagnosis Information", None),
    ("n", "N", FieldType.text, "Diagnosis Information", None),
    ("m", "M", FieldType.text, "Diagnosis Information", None),

    ("date-of-reporting", "Date of Reporting", FieldType.date, "Sample Information", None),
    ("fixation-used", "Fixation Used", FieldType.text, "Sample Information", None),
    ("tumor-percent", "Tumor %", FieldType.text, "Sample Information", None),
    ("necrosis-percent", "Necrosis %", FieldType.text, "Sample Information", None),
    ("storage-temperature", "Storage Temperature", FieldType.text, "Sample Information", None),

    ("hiv", "HIV", FieldType.select, "Serology Report", "Positive, Negative, Not Tested"),
    ("hbv", "HBV", FieldType.select, "Serology Report", "Positive, Negative, Not Tested"),
    ("hcv", "HCV", FieldType.select, "Serology Report", "Positive, Negative, Not Tested"),

    ("treatment-information", "Treatment Information (Adjuvant/Neo-Adjuvant)", FieldType.select, "Treatment Detail", "Adjuvant, Neo-Adjuvant, Treatment Naive"),
    ("neoadjuvant-treatment-details", "If Neo-Adjuvant (Treatment Details)", FieldType.text, "Treatment Detail", None),

    ("biomarker-details", "Biomarker Details", FieldType.text, "Biomarker Characterization", None),
]


def rename_key_everywhere(db, old_key: str, new_key: str) -> int:
    """Renames a field_key on field_definitions AND inside any sample.data
    JSONB blob that already has a value under the old key, so nothing typed
    in previously gets orphaned."""
    defs = db.query(FieldDefinition).filter(FieldDefinition.field_key == old_key).all()
    if not defs:
        return 0
    for d in defs:
        d.field_key = new_key
    db.execute(
        text(
            """
            UPDATE samples
            SET data = (data - :old_key) || jsonb_build_object(:new_key, data -> :old_key)
            WHERE data ? :old_key
            """
        ),
        {"old_key": old_key, "new_key": new_key},
    )
    return len(defs)


def run():
    db = SessionLocal()
    try:
        print("--- Step 1: renaming legacy keys to the sanitized convention ---")
        for old_key, new_key in RENAMES.items():
            count = rename_key_everywhere(db, old_key, new_key)
            if count:
                print(f"renamed: {old_key} -> {new_key} ({count} definition row(s), plus any matching sample data)")
        db.commit()

        print("\n--- Step 2: syncing labels/sections/types, adding anything missing ---")
        for key, label, ftype, section, options in CANONICAL_FIELDS:
            existing = db.query(FieldDefinition).filter(FieldDefinition.field_key == key).all()
            if existing:
                for d in existing:
                    d.field_label = label
                    d.field_type = ftype
                    d.section = section
                    d.options = options
                print(f"updated: {key}")
            else:
                db.add(
                    FieldDefinition(
                        site_id=None,  # global -- visible to every site
                        field_key=key,
                        field_label=label,
                        field_type=ftype,
                        section=section,
                        options=options,
                        created_by=None,
                    )
                )
                print(f"added:   {key}")
        db.commit()
        print("\nDone.")
    finally:
        db.close()


if __name__ == "__main__":
    run()