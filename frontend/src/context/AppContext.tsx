import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  eventsError: string | null;
  setActiveEventId: (id: string | null | ((prev: string | null) => string | null)) => void;
  refreshEvents: () => Promise<void>;
  refreshActiveEvent: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  events: [],
  activeEventId: null,
  activeEvent: null,
  loading: false,
  eventsError: null,
  setActiveEventId: () => {},
  refreshEvents: async () => {},
  refreshActiveEvent: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id ?? null : null;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsOwnerId, setEventsOwnerId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const eventsRequestId = useRef(0);
  const activeEventRequestId = useRef(0);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;

  const refreshEvents = async () => {
    if (!userId) {
      eventsRequestId.current += 1;
      activeEventRequestId.current += 1;
      setEvents([]);
      setEventsOwnerId(null);
      setActiveEventId(null);
      setActiveEvent(null);
      setEventsError(null);
      setLoading(false);
      setLoading(false);
      return;
    }

    const requestId = ++eventsRequestId.current;
    const isCurrentRequest = () =>
      requestId === eventsRequestId.current && currentUserId.current === userId;
    if (eventsOwnerId !== userId) {
      activeEventRequestId.current += 1;
      setEvents([]);
      setActiveEventId(null);
      setActiveEvent(null);
      setEventsOwnerId(userId);
    }
    setEventsError(null);
    try {
      setLoading(true);
      const data = await api.listEvents();
      if (!isCurrentRequest()) return;
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
      if (isCurrentRequest()) {
        setEventsError("We couldn't load your events. Please try again.");
      }
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  };

  const refreshActiveEvent = async () => {
    if (!activeEventId || !userId) {
      activeEventRequestId.current += 1;
      setActiveEvent(null);
      return;
    }
    const requestId = ++activeEventRequestId.current;
    try {
      const data = await api.getEvent(activeEventId);
      if (
        requestId !== activeEventRequestId.current ||
        currentUserId.current !== userId
      ) {
        return;
      }
      setActiveEvent(data);
    } catch (e) {
      console.error('Failed to load active event', e);
      if (
        requestId === activeEventRequestId.current &&
        currentUserId.current === userId
      ) {
        setActiveEvent(null);
      }
    }
  };

  // React to login / logout state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshEvents();
    } else {
      eventsRequestId.current += 1;
      activeEventRequestId.current += 1;
      setEvents([]);
      setEventsOwnerId(null);
      setActiveEventId(null);
      setActiveEvent(null);
      setEventsError(null);
      setLoading(false);
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
        events: eventsOwnerId === userId ? events : [],
        activeEventId: eventsOwnerId === userId ? activeEventId : null,
        activeEvent: eventsOwnerId === userId ? activeEvent : null,
        loading: !!userId && (loading || eventsOwnerId !== userId),
        eventsError: eventsOwnerId === userId ? eventsError : null,
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
