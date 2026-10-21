"""Tasks API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.task import Task, TaskDependency, TaskStatus
from app.models.user import User
from app.models.plan import ActivityRecord
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.core.auth import get_current_user, get_user_event_or_404

router = APIRouter(prefix="/events/{event_id}/tasks", tags=["tasks"])


def _log(db, event_id, action, details=None):
    db.add(ActivityRecord(event_id=event_id, action=action, entity_type="task", details=details))


def _task_to_response(task: Task) -> dict:
    return {
        "id": task.id,
        "event_id": task.event_id,
        "name": task.name,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "duration_days": task.duration_days,
        "is_milestone": task.is_milestone,
        "assigned_to": task.assigned_to,
        "notes": task.notes,
        "dependency_ids": [d.depends_on_id for d in task.dependencies],
    }


@router.get("/")
def list_tasks(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    tasks = db.query(Task).filter(Task.event_id == event_id).order_by(Task.created_at).all()
    return [_task_to_response(t) for t in tasks]


@router.post("/", status_code=201)
def create_task(
    event_id: str,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    task_data = data.model_dump(exclude={"dependency_ids"})
    task = Task(event_id=event_id, **task_data)
    db.add(task)
    db.flush()

    # Add dependencies
    for dep_id in (data.dependency_ids or []):
        dep_task = db.query(Task).filter(Task.id == dep_id, Task.event_id == event_id).first()
        if not dep_task:
            raise HTTPException(status_code=400, detail=f"Dependency task {dep_id} not found")
        db.add(TaskDependency(task_id=task.id, depends_on_id=dep_id))

    _log(db, event_id, f"Task '{data.name}' created")
    db.commit()
    db.refresh(task)
    return _task_to_response(task)


@router.get("/{task_id}")
def get_task(
    event_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    task = db.query(Task).filter(Task.id == task_id, Task.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_response(task)


@router.put("/{task_id}")
def update_task(
    event_id: str,
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    task = db.query(Task).filter(Task.id == task_id, Task.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(task, field, value)
    _log(db, event_id, f"Task '{task.name}' updated to status '{task.status}'")
    db.commit()
    db.refresh(task)
    return _task_to_response(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    event_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    task = db.query(Task).filter(Task.id == task_id, Task.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    _log(db, event_id, f"Task '{task.name}' deleted")
    db.commit()


@router.patch("/{task_id}/status")
def update_task_status(
    event_id: str,
    task_id: str,
    status_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    task = db.query(Task).filter(Task.id == task_id, Task.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    new_status = status_data.get("status")
    if new_status not in [s.value for s in TaskStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    task.status = new_status
    _log(db, event_id, f"Task '{task.name}' marked as {new_status}")
    db.commit()
    return _task_to_response(task)


@router.post("/{task_id}/dependencies", status_code=201)
def add_task_dependency(
    event_id: str,
    task_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    task = db.query(Task).filter(Task.id == task_id, Task.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    depends_on_id = data.get("depends_on_id")
    dep_task = db.query(Task).filter(Task.id == depends_on_id, Task.event_id == event_id).first()
    if not dep_task:
        raise HTTPException(status_code=404, detail="Dependency task not found")
    dep = TaskDependency(task_id=task.id, depends_on_id=depends_on_id)
    db.add(dep)
    db.commit()
    return {"message": "Dependency added"}
