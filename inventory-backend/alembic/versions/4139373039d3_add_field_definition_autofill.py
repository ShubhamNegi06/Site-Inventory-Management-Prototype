"""add is_autofill to field_definitions

Revision ID: 4139373039d3
Revises: baeda89ac4a9
Create Date: 2026-08-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4139373039d3'
down_revision: Union[str, None] = 'baeda89ac4a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'field_definitions',
        sa.Column('is_autofill', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )


def downgrade() -> None:
    op.drop_column('field_definitions', 'is_autofill')
