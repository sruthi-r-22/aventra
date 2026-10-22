import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';
import type { EventItem } from '../api/types';
import { useAuth } from './AuthContext';

export type { EventItem } from '../api/types';

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
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshEvents = async () => {
    if (!isAuthenticated) {
      setEvents([]);
      setActiveEventId(null);
      setActiveEvent(null);
      return;
    }
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
      setEvents([]);
      setActiveEventId(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveEvent = async () => {
    if (!activeEventId || !isAuthenticated) {
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

  // React to login / logout state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshEvents();
    } else {
      setEvents([]);
      setActiveEventId(null);
      setActiveEvent(null);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (activeEventId && isAuthenticated) {
      refreshActiveEvent();
    } else {
      setActiveEvent(null);
    }
  }, [activeEventId, isAuthenticated]);

  return (
    <AppContext.Provider
      value={{
        events,
        activeEventId,
        activeEvent,
        loading,
        setActiveEventId,
        refreshEvents,
        refreshActiveEvent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
