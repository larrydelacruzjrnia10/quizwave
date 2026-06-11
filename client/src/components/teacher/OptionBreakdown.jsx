/**
 * OptionBreakdown — horizontal bar chart shown after each question reveal.
 * Correct answer glows green; wrong answers are dimmed.
 */

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  { bar: 'bg-answer-a', text: 'text-white', border: 'border-answer-a' },
  { bar: 'bg-answer-b', text: 'text-white', border: 'border-answer-b' },
  { bar: 'bg-answer-c', text: 'text-white', border: 'border-answer-c' },
  { bar: 'bg-answer-d', text: 'text-white', border: 'border-answer-d' },
];

export default function OptionBreakdown({ options = [], optionCounts = [], correctIndex }) {
  const total = optionCounts.reduce((s, c) => s + c, 0);

  return (
    <div className="card">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Answer Breakdown</p>
      <div className="flex flex-col gap-3">
        {options.map((opt, i) => {
          const count = optionCounts[i] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isCorrect = i === correctIndex;
          const color = OPTION_COLORS[i];

          return (
            <div key={i} className={`relative ${isCorrect ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex items-center gap-3 mb-1">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center
                              font-black text-sm flex-shrink-0 ${color.bar} ${color.text}`}
                >
                  {OPTION_LETTERS[i]}
                </span>
                <span className="text-sm font-medium text-white flex-1 truncate">{opt}</span>
                <span className="text-sm font-black text-white tabular-nums">
                  {count} <span className="text-gray-400 font-normal">({pct}%)</span>
                </span>
                {isCorrect && (
                  <span className="text-green-400 font-bold text-sm">✓</span>
                )}
              </div>

              {/* Bar */}
              <div className="w-full bg-bg-base rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
