'use client';

import { Card, Button } from '@/components/ui';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = today.toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Calendar</h2><p className="text-slate-400 mt-1">Scheduled publications</p></div>
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">{monthName} {year}</h3>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs text-slate-500 py-2 font-medium">{d}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate();
            return (
              <div key={day} className={`text-center py-3 rounded-lg text-sm ${isToday ? 'bg-orange-500/20 text-orange-400 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                {day}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
