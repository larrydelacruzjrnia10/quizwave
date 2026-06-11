/**
 * AnswerTile — large, touchable answer button for the student phone view.
 * Fills available height in a 2×2 grid. Shows shape icon + label text.
 */

const TILES = [
  { bg: 'bg-answer-a', hover: 'hover:bg-answer-a-hover', shape: '▲', label: 'A' },
  { bg: 'bg-answer-b', hover: 'hover:bg-answer-b-hover', shape: '◆', label: 'B' },
  { bg: 'bg-answer-c', hover: 'hover:bg-answer-c-hover', shape: '●', label: 'C' },
  { bg: 'bg-answer-d', hover: 'hover:bg-answer-d-hover', shape: '■', label: 'D' },
];

export default function AnswerTile({ index, label, onClick, disabled, selected }) {
  const tile = TILES[index] || TILES[0];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Answer ${tile.label}: ${label}`}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-2xl
        font-black text-white transition-all duration-150 select-none
        min-h-[120px] touch-manipulation
        focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2
        focus-visible:ring-offset-bg-base
        ${tile.bg} ${!disabled ? tile.hover : ''}
        ${selected ? 'scale-95 brightness-90 ring-4 ring-white' : ''}
        ${disabled && !selected ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}
      `}
    >
      {/* Shape icon */}
      <span className="text-3xl leading-none opacity-90">{tile.shape}</span>

      {/* Answer text */}
      {label && (
        <span className="text-sm font-bold text-center leading-tight px-3 line-clamp-2">
          {label}
        </span>
      )}

      {/* Letter badge */}
      <span className="absolute top-2 left-3 text-xs font-black opacity-60">
        {tile.label}
      </span>

      {/* Selected indicator */}
      {selected && (
        <span className="absolute top-2 right-3 text-white font-black text-sm">✓</span>
      )}
    </button>
  );
}
