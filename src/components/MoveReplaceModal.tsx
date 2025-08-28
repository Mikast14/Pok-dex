import React from 'react';

interface MoveReplaceModalProps {
  currentMoves: string[];
  newMove: string;
  onReplace: (moveToForget: string) => void;
  onSkip: () => void;
  getMoveDetails?: (moveName: string) => React.ReactNode; // Optional for tooltips/details
}

const MoveReplaceModal: React.FC<MoveReplaceModalProps> = ({ currentMoves, newMove, onReplace, onSkip, getMoveDetails }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-2 text-center">Learn New Move?</h3>
        <div className="mb-4 text-center">
          <span>Your Pokémon wants to learn </span>
          <span className="font-semibold text-blue-600 dark:text-blue-300">{newMove}</span>
          <span>, but it already knows 4 moves.</span>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">Current Moves:</div>
          <div className="grid grid-cols-1 gap-2">
            {currentMoves.map((move) => (
              <button
                key={move}
                className="w-full px-3 py-2 rounded bg-gray-200 dark:bg-white/10 text-left hover:bg-blue-100 dark:hover:bg-blue-900 transition"
                onClick={() => onReplace(move)}
              >
                <div className="flex items-center justify-between">
                  <span className="capitalize font-medium">{move}</span>
                  <span className="text-xs text-gray-500">(Forget)</span>
                </div>
                {getMoveDetails && (
                  <div className="mt-1">{getMoveDetails(move)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">New Move:</div>
          <div className="px-3 py-2 rounded bg-green-100 dark:bg-green-900">
            <span className="capitalize font-medium">{newMove}</span>
            {getMoveDetails && (
              <div className="mt-1">{getMoveDetails(newMove)}</div>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-300 dark:bg-white/20 text-gray-800 dark:text-slate-200 hover:bg-gray-400 dark:hover:bg-white/30"
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveReplaceModal;
