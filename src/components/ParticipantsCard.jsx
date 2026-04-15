import React from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';

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
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-slate-800">
        <Users className="w-4 h-4 text-indigo-500" />
        People Involved
        <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {participants.length}
        </span>
      </h2>

      {/* Add input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newParticipant}
          onChange={e => onNewParticipantChange(e.target.value)}
          placeholder="Add name…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-gray-50 placeholder-slate-300 transition-all"
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          aria-label="New participant name"
        />
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          aria-label="Add participant"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Participant chips */}
      <div className="flex flex-wrap gap-2">
        {participants.length === 0 && (
          <p className="text-sm text-slate-400 italic">No participants yet.</p>
        )}
        {participants.map(p => (
          <div
            key={p}
            className="group flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            <span>{p}</span>
            <button
              onClick={() => onRemove(p)}
              className="text-indigo-400 hover:text-red-500 transition-colors"
              aria-label={`Remove ${p}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantsCard;
