import { useState, useEffect, useRef } from 'react';

/**
 * Tracks a countdown driven by server time_tick events.
 * The server emits game:time_tick every second with { secondsLeft }.
 * We mirror it locally with 1-second client ticks as a fallback.
 */
export function useCountdown(initial = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initial);
  const timerRef = useRef(null);

  function start(totalSeconds) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(totalSeconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Allow server tick to override local state (keeps clocks in sync after rejoin)
  function syncFromServer(value) {
    setSecondsLeft(value);
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  useEffect(() => () => stop(), []);

  return { secondsLeft, start, stop, syncFromServer };
}
