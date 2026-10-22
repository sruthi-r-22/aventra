export type EventType = 'wedding' | 'birthday' | 'college_fest' | 'community' | 'corporate' | 'other';
export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PlanningMode = 'manual' | 'ai';

export interface EventItem {
  id: string;
  name: string;
  event_type: EventType;
  planning_mode?: PlanningMode;
  event_date: string;
  location: string;
  guest_count: number;
  total_budget: number;
  status: EventStatus;
  days_remaining: number;
  allocated_budget: number;
  unallocated_budget?: number;
  actual_expenses: number;
  unspent_budget?: number;
  remaining_budget?: number;
  task_count: number;
  completed_tasks: number;
  feasibility_status: string;
  description?: string;
  preferences?: string;
}

export interface EventCreateRequest {
  name: string;
  event_type: EventType;
  planning_mode?: PlanningMode;
  event_date: string;
  location: string;
  guest_count: number;
  total_budget: number;
  description?: string | null;
  preferences?: string | null;
  mandatory_expenses?: Record<string, unknown>[] | null;
  initial_categories?: Record<string, unknown>[] | null;
  initial_tasks?: Record<string, unknown>[] | null;
  initial_vendors?: Record<string, unknown>[] | null;
}

export type AIDraftRequest = Omit<EventCreateRequest, 'planning_mode' | 'initial_categories' | 'initial_tasks' | 'initial_vendors'>;

export interface EventUpdateRequest {
  name?: string | null;
  event_date?: string | null;
  location?: string | null;
  guest_count?: number | null;
  total_budget?: number | null;
  description?: string | null;
  preferences?: string | null;
  status?: EventStatus | null;
}

export interface EventCreateResponse {
  id: string;
  name: string;
  event_type: string;
  planning_mode: PlanningMode;
  event_date: string;
  location: string;
  guest_count: number;
  total_budget: number;
  status: EventStatus;
  plan_theme: string;
  plan_description: string;
  planning_notes: string;
  is_ai_generated: boolean;
  feasibility: Record<string, unknown>;
}

export interface AIDraftResponse {
  theme: string;
  description: string;
  budget_categories: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  vendor_categories: Record<string, unknown>[];
  planning_notes: string;
  is_ai_generated: boolean;
  validation: Record<string, unknown>;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskItem {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  duration_days: number;
  is_milestone: boolean;
  assigned_to?: string | null;
  notes?: string | null;
  dependency_ids: string[];
}

export interface TaskCreateRequest {
  name: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  duration_days?: number;
  is_milestone?: boolean;
  assigned_to?: string | null;
  notes?: string | null;
  dependency_ids?: string[] | null;
}

export interface TaskUpdateRequest {
  name?: string | null;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  due_date?: string | null;
  duration_days?: number | null;
  is_milestone?: boolean | null;
  assigned_to?: string | null;
  notes?: string | null;
}
