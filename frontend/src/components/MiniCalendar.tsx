import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

interface Props {
  highlightDate?: string; // ISO date
}

export default function MiniCalendar({ highlightDate }: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const highlight = highlightDate ? new Date(highlightDate) : null;

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isHighlight = (d: number) =>
    highlight
      ? d === highlight.getDate() && month === highlight.getMonth() && year === highlight.getFullYear()
      : false;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-[#17252B]">
          {MONTHS[month]}, {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`text-center text-[12px] h-7 w-7 mx-auto rounded-full font-medium leading-none flex items-center justify-center transition-colors
              ${d === null ? '' : isHighlight(d) ? 'bg-[#164B3D] text-white font-bold shadow-xs' : isToday(d) ? 'bg-[#E5EFE8] text-[#164B3D] font-bold' : 'text-gray-600 hover:bg-gray-100 cursor-pointer'}
            `}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
