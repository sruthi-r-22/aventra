// API client for Aventra backend
const BASE_URL = '/api/v1';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null as T;
  return response.json();
}

// Events
export const api = {
  health: () => request<any>('/api/health'.replace('/api/v1', '')),
  
  // Events
  createEvent: (data: any) => request<any>('/events/', { method: 'POST', body: JSON.stringify(data) }),
  generateAIDraft: (data: any) => request<any>('/events/ai-draft', { method: 'POST', body: JSON.stringify(data) }),
  listEvents: () => request<any[]>('/events/'),
  getEvent: (id: string) => request<any>(`/events/${id}`),
  updateEvent: (id: string, data: any) => request<any>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => request<void>(`/events/${id}`, { method: 'DELETE' }),
  validatePlan: (id: string) => request<any>(`/events/${id}/validate`, { method: 'POST' }),
  getActivities: (id: string) => request<any[]>(`/events/${id}/activities`),

  // Budget
  getBudget: (eventId: string) => request<any>(`/events/${eventId}/budget/`),
  createCategory: (eventId: string, data: any) =>
    request<any>(`/events/${eventId}/budget/categories`, { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (eventId: string, catId: string, data: any) =>
    request<any>(`/events/${eventId}/budget/categories/${catId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (eventId: string, catId: string) =>
    request<void>(`/events/${eventId}/budget/categories/${catId}`, { method: 'DELETE' }),
  listExpenses: (eventId: string) => request<any[]>(`/events/${eventId}/budget/expenses`),
  createExpense: (eventId: string, data: any) =>
    request<any>(`/events/${eventId}/budget/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (eventId: string, expId: string, data: any) =>
    request<any>(`/events/${eventId}/budget/expenses/${expId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (eventId: string, expId: string) =>
    request<void>(`/events/${eventId}/budget/expenses/${expId}`, { method: 'DELETE' }),

  // Tasks
  listTasks: (eventId: string) => request<any[]>(`/events/${eventId}/tasks/`),
  createTask: (eventId: string, data: any) =>
    request<any>(`/events/${eventId}/tasks/`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (eventId: string, taskId: string, data: any) =>
    request<any>(`/events/${eventId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTaskStatus: (eventId: string, taskId: string, status: string) =>
    request<any>(`/events/${eventId}/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteTask: (eventId: string, taskId: string) =>
    request<void>(`/events/${eventId}/tasks/${taskId}`, { method: 'DELETE' }),

  // Vendors
  listVendors: (eventId: string) => request<any[]>(`/events/${eventId}/vendors/`),
  createVendor: (eventId: string, data: any) =>
    request<any>(`/events/${eventId}/vendors/`, { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (eventId: string, vendorId: string, data: any) =>
    request<any>(`/events/${eventId}/vendors/${vendorId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (eventId: string, vendorId: string) =>
    request<void>(`/events/${eventId}/vendors/${vendorId}`, { method: 'DELETE' }),

  // Replanning
  previewReplan: (eventId: string, data: any) =>
    request<any>(`/events/${eventId}/replan/preview`, { method: 'POST', body: JSON.stringify(data) }),
  acceptReplan: (eventId: string, data: any) =>
    request<any>(`/events/${eventId}/replan/accept`, { method: 'POST', body: JSON.stringify(data) }),
  getPlanHistory: (eventId: string) =>
    request<any[]>(`/events/${eventId}/replan/history`),
};

export default api;
