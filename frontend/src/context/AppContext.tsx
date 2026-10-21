import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';

export interface EventItem {
  id: string;
  name: string;
  event_type: string;
  planning_mode?: string;
  event_date: string;
  location: string;
  guest_count: number;
  total_budget: number;
  status: string;
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

interface AppContextType {
  events: EventItem[];
  activeEventId: string | null;
  activeEvent: EventItem | null;
  loading: boolean;
  setActiveEventId: (id: string | null | ((prev: string | null) => string | null)) => void;
  refreshEvents: () => Promise<void>;
  refreshActiveEvent: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  events: [],
  activeEventId: null,
  activeEvent: null,
  loading: false,
  setActiveEventId: () => {},
  refreshEvents: async () => {},
  refreshActiveEvent: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(
    localStorage.getItem('activeEventId')
  );
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshEvents = async () => {
    try {
      setLoading(true);
      const data = await api.listEvents();
      setEvents(data);
      setActiveEventId((prev) => {
        if (data.length > 0) {
          if (!prev || !data.some((e) => e.id === prev)) {
            return data[0].id;
          }
          return prev;
        } else {
          return null;
        }
      });
    } catch (e) {
      console.error('Failed to load events', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveEvent = async () => {
    if (!activeEventId) {
      setActiveEvent(null);
      return;
    }
    try {
      const data = await api.getEvent(activeEventId);
      setActiveEvent(data);
    } catch (e) {
      console.error('Failed to load active event', e);
      setActiveEvent(null);
    }
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  useEffect(() => {
    if (activeEventId) {
      localStorage.setItem('activeEventId', activeEventId);
      refreshActiveEvent();
    } else {
      localStorage.removeItem('activeEventId');
      setActiveEvent(null);
    }
  }, [activeEventId]);

  return (
    <AppContext.Provider value={{
      events, activeEventId, activeEvent, loading,
      setActiveEventId, refreshEvents, refreshActiveEvent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
