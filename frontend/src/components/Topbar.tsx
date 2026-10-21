import { useState } from 'react';
import { Search, Bell, ChevronDown, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onSearch?: (query: string) => void;
}

export default function Topbar({ onSearch }: TopbarProps) {
  const { events, activeEventId, setActiveEventId, activeEvent } = useApp();
  const navigate = useNavigate();
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-20">
      {/* Search Input */}
      <div className="relative w-72">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search..."
          value={searchVal}
          onChange={handleSearchChange}
          className="w-full pl-9 pr-4 py-2 bg-gray-50/80 border border-transparent rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:bg-white focus:border-gray-200 focus:outline-none transition-all"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Event Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEventDropdown(!showEventDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-gray-100/80 rounded-xl text-[13px] font-semibold text-[#1a2b4a] border border-gray-100 transition-colors"
          >
            <CalendarIcon size={14} className="text-blue-600" />
            <span className="max-w-44 truncate">
              {activeEvent?.name || (events.length > 0 ? 'Select Event' : 'No Events')}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showEventDropdown && (
            <div className="absolute right-0 top-12 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Select Active Event
              </div>
              {events.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setActiveEventId(e.id);
                    setShowEventDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    e.id === activeEventId ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate">{e.name}</p>
                    <p className="text-[11px] text-gray-400 font-normal">{e.event_date} • {e.event_type}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ml-2 ${
                    e.feasibility_status === 'feasible' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {e.feasibility_status}
                  </span>
                </button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1 px-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventDropdown(false);
                    navigate('/events?create=true');
                  }}
                  className="w-full text-center py-2 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  + Create New Event
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Workspace shortcut button */}
        <button
          type="button"
          onClick={() => navigate('/ai-workspace')}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200/60 rounded-xl text-[12px] font-semibold hover:from-blue-100 hover:to-indigo-100 transition-colors"
        >
          <Sparkles size={14} className="text-blue-500" />
          <span>AI Replan</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-2 right-2 ring-2 ring-white" />
        </button>

        {/* User profile avatar matching Aventik design */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-[13px] font-bold shadow-xs">
            AV
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <span className="text-[13px] font-bold text-[#1a2b4a] block">Organizer 👋</span>
            <span className="text-[11px] text-gray-400 block font-medium">Aventra Planner</span>
          </div>
        </div>
      </div>
    </header>
  );
}
