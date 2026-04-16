import React from 'react';
import { Users, Plus, X } from 'lucide-react';

/**
 * Participants card — add and remove people involved in the trip.
 */
const ParticipantsCard = ({
  participants,
  newParticipant,
  onNewParticipantChange,
  onAdd,
  onRemove,
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80">
      <h2 className="text-xs font-semibold flex items-center gap-2 mb-4 text-slate-500 uppercase tracking-widest">
        <Users className="w-3.5 h-3.5 text-indigo-400" />
        People Involved
        <span className="ml-auto text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {participants.length}
        </span>
      </h2>

      {/* Add input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newParticipant}
          onChange={e => onNewParticipantChange(e.target.value)}
          placeholder="Add person…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 text-sm bg-gray-50/50 placeholder-slate-300 transition-all"
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          aria-label="New participant name"
        />
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white w-9 h-9 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0"
          aria-label="Add participant"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Participant chips */}
      <div className="flex flex-wrap gap-1.5">
        {participants.length === 0 && (
          <p className="text-sm text-slate-400 italic">No participants yet.</p>
        )}
        {participants.map((p, i) => {
          // Rotate through some accent colors for visual distinction
          const colors = [
            'bg-indigo-50 text-indigo-700 border-indigo-200/60',
            'bg-violet-50 text-violet-700 border-violet-200/60',
            'bg-sky-50 text-sky-700 border-sky-200/60',
            'bg-emerald-50 text-emerald-700 border-emerald-200/60',
            'bg-amber-50 text-amber-700 border-amber-200/60',
            'bg-rose-50 text-rose-700 border-rose-200/60',
          ];
          const color = colors[i % colors.length];
          return (
            <div
              key={p}
              className={`group flex items-center gap-1.5 ${color} border px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:shadow-sm`}
            >
              <span>{p}</span>
              <button
                onClick={() => onRemove(p)}
                className="opacity-40 group-hover:opacity-100 hover:text-red-500 transition-all"
                aria-label={`Remove ${p}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantsCard;
