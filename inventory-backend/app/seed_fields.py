"""
Seeds the standard "static" fields from the sample template as global
field definitions, so every site sees them by default instead of each
site having to add them one at a time.

Idempotent: skips any field_key that already exists anywhere (global or
site-scoped), so it's safe to re-run and won't duplicate fields you've
already added by hand (e.g. Age/Gender).

Run once, after your admin account exists:
    uv run python -m app.seed_fields
"""
from app.db.session import SessionLocal
from app.models.field_definition import FieldDefinition, FieldType

# (field_key, label, type, section, options)
STANDARD_FIELDS = [
    ("type_of_tissue", "Type of Tissue", FieldType.select, "Case Details", "Tumor, NAT, Normal, Adjacent Normal"),

    ("ethnicity", "Ethnicity", FieldType.text, "Demographic Details", None),
    ("country_of_origin", "Country Of Origin", FieldType.text, "Demographic Details", None),

    ("date_of_biopsy_surgery", "Date of Biopsy/Surgery", FieldType.date, "Diagnosis Information", None),
    ("diagnostic_procedure", "Diagnostic Procedure", FieldType.text, "Diagnosis Information", None),
    ("origin_site", "Origin Site", FieldType.text, "Diagnosis Information", None),
    ("diagnosis_result", "Diagnosis Result", FieldType.text, "Diagnosis Information", None),
    ("grade", "Grade", FieldType.text, "Diagnosis Information", None),
    ("figo_stage", "FIGO Stage", FieldType.text, "Diagnosis Information", None),
    ("t", "T", FieldType.text, "Diagnosis Information", None),
    ("n", "N", FieldType.text, "Diagnosis Information", None),
    ("m", "M", FieldType.text, "Diagnosis Information", None),

    ("fixation_used", "Fixation Used", FieldType.text, "Sample Information", None),
    ("tumor_percent", "Tumor %", FieldType.text, "Sample Information", None),
    ("necrosis_percent", "Necrosis %", FieldType.text, "Sample Information", None),
    ("sample_storage", "Sample Storage", FieldType.text, "Sample Information", None),

    ("hiv", "HIV", FieldType.select, "Serology Report", "Positive, Negative, Not Tested"),
    ("hbv", "HBV", FieldType.select, "Serology Report", "Positive, Negative, Not Tested"),
    ("hcv", "HCV", FieldType.select, "Serology Report", "Positive, Negative, Not Tested"),

    ("treatment_information", "Treatment Information", FieldType.text, "Treatment Detail", None),

    ("biomarker_details", "Biomarker Details", FieldType.text, "Biomarker Characterization", None),
]


def run():
    db = SessionLocal()
    try:
        existing_keys = {f.field_key for f in db.query(FieldDefinition.field_key).all()}
        created = 0
        for key, label, ftype, section, options in STANDARD_FIELDS:
            if key in existing_keys:
                print(f"skip  (already exists): {key}")
                continue
            db.add(FieldDefinition(
                site_id=None,  # global -- visible to every site
                field_key=key,
                field_label=label,
                field_type=ftype,
                section=section,
                options=options,
                created_by=None,
            ))
            created += 1
            print(f"added: {key}")
        db.commit()
        print(f"\nDone -- {created} field(s) added, {len(STANDARD_FIELDS) - created} skipped.")
    finally:
        db.close()


if __name__ == "__main__":
    run()