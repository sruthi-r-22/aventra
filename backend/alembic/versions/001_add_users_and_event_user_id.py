"""Add users table and event user_id ownership

Revision ID: 001_users_and_ownership
Revises: 
Create Date: 2026-10-21 22:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_users_and_ownership'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. Add user_id column to events table
    context = op.get_context()
    dialect = context.dialect.name if hasattr(context, "dialect") and context.dialect else "postgresql"

    if dialect == "sqlite":
        with op.batch_alter_table('events') as batch_op:
            batch_op.add_column(sa.Column('user_id', sa.String(), nullable=True))
            batch_op.create_index('ix_events_user_id', ['user_id'], unique=False)
            batch_op.create_foreign_key(
                'fk_events_user_id_users',
                'users',
                ['user_id'], ['id'],
                ondelete='CASCADE'
            )
    else:
        op.add_column('events', sa.Column('user_id', sa.String(), nullable=True))
        op.create_index('ix_events_user_id', 'events', ['user_id'], unique=False)
        op.create_foreign_key(
            'fk_events_user_id_users',
            'events',
            'users',
            ['user_id'], ['id'],
            ondelete='CASCADE'
        )


def downgrade() -> None:
    context = op.get_context()
    dialect = context.dialect.name if hasattr(context, "dialect") and context.dialect else "postgresql"

    if dialect == "sqlite":
        with op.batch_alter_table('events') as batch_op:
            batch_op.drop_constraint('fk_events_user_id_users', type_='foreignkey')
            batch_op.drop_index('ix_events_user_id')
            batch_op.drop_column('user_id')
    else:
        op.drop_constraint('fk_events_user_id_users', 'events', type_='foreignkey')
        op.drop_index('ix_events_user_id', table_name='events')
        op.drop_column('events', 'user_id')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
