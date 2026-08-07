from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.field_definition import FieldDefinition
from app.models.user import User, UserRole
from app.schemas.field_definition import FieldDefinitionCreate, FieldDefinitionOut, SearchFieldSuggestion

router = APIRouter(prefix="/field-definitions", tags=["field-definitions"])


@router.post("", response_model=FieldDefinitionOut)
def create_field_definition(
    payload: FieldDefinitionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Called when someone adds a brand-new field via the "add new field"
    option on the sample form. Site users register the field scoped to
    their own site; admins can register a field with site_id=NULL so it
    shows up as an available field for everyone.
    """
    field = FieldDefinition(
        site_id=None if user.role == UserRole.admin else user.site_id,
        field_key=payload.field_key,
        field_label=payload.field_label,
        field_type=payload.field_type,
        section=payload.section,
        options=payload.options,
        created_by=user.id,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.get("", response_model=list[FieldDefinitionOut])
def list_field_definitions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns global fields + (for site users) their own site's fields, for form rendering."""
    query = db.query(FieldDefinition)
    if user.role == UserRole.site:
        query = query.filter(
            or_(FieldDefinition.site_id.is_(None), FieldDefinition.site_id == user.site_id)
        )
    return query.order_by(FieldDefinition.created_at.desc()).all()

@router.get(
    "/search-fields",
    response_model=list[SearchFieldSuggestion]
)
def search_fields(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(FieldDefinition)

    if user.role == UserRole.site:
        query = query.filter(
            or_(
                FieldDefinition.site_id == user.site_id,
                FieldDefinition.site_id.is_(None),
            )
        )

    query = query.filter(
        or_(
            FieldDefinition.field_key.ilike(f"{q}%"),
            FieldDefinition.field_label.ilike(f"{q}%"),
        )
    )

    fields = (
        query.order_by(FieldDefinition.field_key)
        .limit(20)
        .all()
    )

    return [
        SearchFieldSuggestion(
            key=f.field_key,
            label=f.field_label,
            type=f.field_type,
        )
        for f in fields
    ]

@router.delete("/{field_id}", status_code=204)
def delete_field_definition(
    field_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Removes a field from the "known fields" list so it stops appearing on
    future sample forms. This does NOT touch existing samples -- any value
    already saved under that key stays in their `data` blob untouched, it
    just won't have a labeled input anymore. Admins can remove any field;
    site users can only remove fields scoped to their own site (not global
    fields an admin registered).
    """
    field = db.query(FieldDefinition).filter(FieldDefinition.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    if user.role != UserRole.admin and field.site_id != user.site_id:
        raise HTTPException(status_code=403, detail="You can only remove fields scoped to your own site")

    db.delete(field)
    db.commit()
