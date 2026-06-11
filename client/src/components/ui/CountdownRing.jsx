/**
 * CountdownRing — SVG circle that depletes as time runs out.
 * Stroke color shifts: indigo → amber → red in the last 10 seconds.
 * No CSS module needed — uses inline styles for the transition.
 */
export default function CountdownRing({ total, remaining, size = 80 }) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = total > 0 ? remaining / total : 0;
  const dashoffset = circumference * (1 - progress);

  const color =
    remaining <= 5 ? '#ef4444' : remaining <= 10 ? '#fbbf24' : '#6366f1';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${remaining} seconds remaining`}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e1b4b"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="absolute font-black text-white"
        style={{ fontSize: size * 0.32 }}
      >
        {remaining}
      </span>
    </div>
  );
}
