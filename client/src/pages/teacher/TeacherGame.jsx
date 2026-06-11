/**
 * TeacherGame.jsx
 * Handles the full game lifecycle for the host:
 *   lobby → question → revealing → (repeat) → finished
 *
 * Socket events listened to:
 *   host:connected, host:player_list, host:answer_progress, host:all_answered,
 *   game:started, game:question, game:time_tick, game:question_end, game:ended, game:error
 *
 * Socket events emitted:
 *   host:connect, host:start, host:next, host:reveal_now, host:kick
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import Leaderboard from '../../components/ui/Leaderboard';
import OptionBreakdown from '../../components/teacher/OptionBreakdown';
import CountdownRing from '../../components/ui/CountdownRing';

export default function TeacherGame() {
  const { gameCode } = useParams();
  const { token } = useAuth();
  const { connect, disconnect } = useSocketContext();
  const navigate = useNavigate();
  const { secondsLeft, start: startCountdown, syncFromServer, stop: stopCountdown } = useCountdown();

  const [phase, setPhase] = useState('connecting'); // connecting|lobby|question|revealing|finished
  const [quizTitle, setQuizTitle] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answerProgress, setAnswerProgress] = useState({ answered: 0, total: 0 });
  const [allAnswered, setAllAnswered] = useState(false);
  const [revealData, setRevealData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [socketRef, setSocketRef] = useState(null);

  useEffect(() => {
    const socket = connect();
    setSocketRef(socket);

    // Attach to existing in-memory session
    socket.emit('host:connect', { gameCode, token });

    socket.on('host:connected', (data) => {
      setQuizTitle(data.quizTitle);
      setTotalQuestions(data.totalQuestions);
      setPlayers(data.players || []);
      setPhase(data.status === 'lobby' ? 'lobby' : data.status);
    });

    socket.on('host:player_list', ({ players }) => setPlayers(players));

    socket.on('host:answer_progress', ({ answered, total }) => {
      setAnswerProgress({ answered, total });
    });

    socket.on('host:all_answered', () => setAllAnswered(true));

    socket.on('game:started', ({ totalQuestions }) => {
      setTotalQuestions(totalQuestions);
    });

    socket.on('game:question', (q) => {
      setCurrentQuestion(q);
      setQuestionIndex(q.index);
      setRevealData(null);
      setAllAnswered(false);
      setAnswerProgress({ answered: 0, total: players.length });
      setPhase('question');
      startCountdown(q.timeLimit);
    });

    socket.on('game:time_tick', ({ secondsLeft }) => syncFromServer(secondsLeft));

    socket.on('game:question_end', (data) => {
      stopCountdown();
      setRevealData(data);
      setLeaderboard(data.leaderboard || []);
      setPhase('revealing');
    });

    socket.on('game:ended', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
      setPhase('finished');
    });

    socket.on('game:error', ({ code, message }) => {
      if (code === 'GAME_NOT_FOUND') {
        setError('Game session not found. It may have expired.');
      } else {
        setError(message);
      }
      setPhase('error');
    });

    return () => {
      socket.off('host:connected');
      socket.off('host:player_list');
      socket.off('host:answer_progress');
      socket.off('host:all_answered');
      socket.off('game:started');
      socket.off('game:question');
      socket.off('game:time_tick');
      socket.off('game:question_end');
      socket.off('game:ended');
      socket.off('game:error');
    };
  }, [gameCode, token]);

  const emit = useCallback(
    (event, data = {}) => socketRef?.emit(event, { gameCode, ...data }),
    [socketRef, gameCode]
  );

  if (phase === 'connecting') {
    return (
      <div className="page">
        <p className="text-gray-400 animate-pulse">Connecting to game…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="page">
        <div className="card text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-red-300 font-bold mb-4">{error}</p>
          <button
            onClick={() => navigate('/teacher/quizzes')}
            className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-xl"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-bg-border">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">QuizWave</p>
          <p className="font-bold truncate max-w-xs">{quizTitle}</p>
        </div>
        {phase !== 'finished' && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Game Code</p>
            <p className="text-xl font-black tracking-widest text-primary">{gameCode}</p>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col">
        {phase === 'lobby' && (
          <LobbyView
            gameCode={gameCode}
            players={players}
            onStart={() => emit('host:start')}
            onKick={(email) => emit('host:kick', { email })}
          />
        )}

        {phase === 'question' && currentQuestion && (
          <QuestionView
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            secondsLeft={secondsLeft}
            answerProgress={answerProgress}
            allAnswered={allAnswered}
            onRevealNow={() => emit('host:reveal_now')}
          />
        )}

        {phase === 'revealing' && revealData && (
          <RevealView
            question={currentQuestion}
            revealData={revealData}
            leaderboard={leaderboard}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            onNext={() => emit('host:next')}
            isLastQuestion={questionIndex + 1 >= totalQuestions}
          />
        )}

        {phase === 'finished' && (
          <FinishedView
            leaderboard={leaderboard}
            quizTitle={quizTitle}
            onDone={() => navigate('/teacher/quizzes')}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-views ─────────────────────────────────────────────────────────── */

function LobbyView({ gameCode, players, onStart, onKick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-8 px-4">
      {/* Join code — big and projector-readable */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Students go to</p>
        <p className="text-white font-black text-xl mb-1">quizwave.app/join</p>
        <p className="text-gray-400 text-sm uppercase tracking-widest mt-4 mb-2">Game Code</p>
        <div className="inline-block bg-bg-card border-2 border-primary rounded-2xl px-10 py-5 glow">
          <span className="text-6xl sm:text-8xl font-black tracking-[0.15em] text-white">
            {gameCode}
          </span>
        </div>
      </div>

      {/* Player count */}
      <p className="text-gray-300 mb-4 text-sm">
        {players.length} player{players.length !== 1 ? 's' : ''} joined
      </p>

      {/* Player chips */}
      {players.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mb-8">
          {players.map((p) => (
            <div
              key={p.email}
              className="flex items-center gap-2 bg-bg-card border border-bg-border
                         rounded-full px-4 py-2 text-sm animate-pop group"
            >
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs
                               flex items-center justify-center font-bold">
                {p.displayName[0].toUpperCase()}
              </span>
              <span>{p.displayName}</span>
              <button
                onClick={() => onKick(p.email)}
                className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs ml-1"
                title="Remove player"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onStart}
        disabled={players.length === 0}
        className="bg-primary hover:bg-primary-hover text-white font-black text-xl
                   px-12 py-5 rounded-2xl transition-all active:scale-95
                   disabled:opacity-40 disabled:cursor-not-allowed glow"
      >
        Start Game →
      </button>
      {players.length === 0 && (
        <p className="text-gray-500 text-sm mt-3">Waiting for at least one student to join</p>
      )}
    </div>
  );
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_BG = ['bg-answer-a', 'bg-answer-b', 'bg-answer-c', 'bg-answer-d'];

function QuestionView({ question, questionIndex, totalQuestions, secondsLeft, answerProgress, allAnswered, onRevealNow }) {
  const urgency = secondsLeft <= 5 ? 'text-red-400' : secondsLeft <= 10 ? 'text-yellow-400' : 'text-primary-light';

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl w-full mx-auto">
      {/* Progress + timer */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-400">
          Question {questionIndex + 1} / {totalQuestions}
        </span>
        <div className="flex items-center gap-3">
          <CountdownRing total={question.timeLimit} remaining={secondsLeft} size={72} />
        </div>
      </div>

      {/* Question text */}
      <div className="card mb-6 text-center">
        <p className="text-2xl sm:text-4xl font-black leading-tight">{question.text}</p>
      </div>

      {/* Options grid — teacher sees the options (for projector context) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {question.options.map((opt, i) => (
          <div
            key={i}
            className={`${OPTION_BG[i]} rounded-xl p-4 flex items-center gap-3`}
          >
            <span className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center
                             font-black text-lg flex-shrink-0">
              {OPTION_LETTERS[i]}
            </span>
            <span className="font-bold text-white">{opt}</span>
          </div>
        ))}
      </div>

      {/* Answer progress */}
      <div className="flex items-center justify-between">
        <p className="text-gray-300 text-sm">
          <span className="font-bold text-white text-lg">{answerProgress.answered}</span>
          &nbsp;/ {answerProgress.total} answered
          {allAnswered && <span className="text-green-400 ml-2">✓ All done!</span>}
        </p>
        <button
          onClick={onRevealNow}
          className="bg-bg-card border border-bg-border hover:border-primary
                     text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          Reveal Now
        </button>
      </div>
    </div>
  );
}

function RevealView({ question, revealData, leaderboard, questionIndex, totalQuestions, onNext, isLastQuestion }) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 max-w-5xl mx-auto w-full">
      {/* Left: breakdown */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-400">Question {questionIndex + 1} / {totalQuestions}</span>
          <span className="ml-auto text-green-400 font-bold text-sm">✓ Revealed</span>
        </div>

        <div className="card mb-4">
          <p className="text-xl font-bold mb-1">{question?.text}</p>
          {revealData.explanation && (
            <p className="text-gray-400 text-sm">{revealData.explanation}</p>
          )}
        </div>

        <OptionBreakdown
          options={question?.options || []}
          optionCounts={revealData.optionCounts}
          correctIndex={revealData.correctIndex}
        />

        <button
          onClick={onNext}
          className="w-full mt-6 bg-primary hover:bg-primary-hover text-white font-black
                     text-lg py-4 rounded-2xl transition-all active:scale-95"
        >
          {isLastQuestion ? '🏁 Show Final Results' : 'Next Question →'}
        </button>
      </div>

      {/* Right: live leaderboard */}
      <div className="lg:w-72">
        <p className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-3">
          Leaderboard
        </p>
        <Leaderboard entries={leaderboard.slice(0, 8)} />
      </div>
    </div>
  );
}

function FinishedView({ leaderboard, quizTitle, onDone }) {
  const top3 = leaderboard.slice(0, 3);
  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-8 px-4 pb-8">
      <h2 className="text-3xl font-black mb-1">Game Over!</h2>
      <p className="text-gray-400 mb-8">{quizTitle}</p>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-8 w-full max-w-md">
        {/* Silver (index 1) */}
        {top3[1] && (
          <div className="flex flex-col items-center flex-1">
            <span className="text-3xl mb-1">{MEDAL[1]}</span>
            <div className="w-full bg-bg-card border border-bg-border rounded-t-xl pt-4 pb-3 px-2 text-center"
              style={{ height: '100px' }}>
              <p className="font-bold truncate text-sm">{top3[1].displayName}</p>
              <p className="text-silver text-sm font-black">{top3[1].score.toLocaleString()}</p>
            </div>
            <div className="w-full bg-silver/20 h-3 rounded-b-xl" />
          </div>
        )}
        {/* Gold (index 0) */}
        {top3[0] && (
          <div className="flex flex-col items-center flex-1">
            <span className="text-4xl mb-1">{MEDAL[0]}</span>
            <div className="w-full bg-bg-card border-2 border-yellow-500 rounded-t-xl pt-4 pb-3 px-2 text-center glow"
              style={{ height: '130px' }}>
              <p className="font-bold truncate">{top3[0].displayName}</p>
              <p className="text-gold font-black text-lg">{top3[0].score.toLocaleString()}</p>
            </div>
            <div className="w-full bg-gold/20 h-4 rounded-b-xl" />
          </div>
        )}
        {/* Bronze (index 2) */}
        {top3[2] && (
          <div className="flex flex-col items-center flex-1">
            <span className="text-3xl mb-1">{MEDAL[2]}</span>
            <div className="w-full bg-bg-card border border-bg-border rounded-t-xl pt-4 pb-3 px-2 text-center"
              style={{ height: '80px' }}>
              <p className="font-bold truncate text-sm">{top3[2].displayName}</p>
              <p className="text-bronze text-sm font-black">{top3[2].score.toLocaleString()}</p>
            </div>
            <div className="w-full bg-bronze/20 h-2 rounded-b-xl" />
          </div>
        )}
      </div>

      {/* Full leaderboard */}
      {leaderboard.length > 3 && (
        <div className="w-full max-w-md mb-8">
          <Leaderboard entries={leaderboard} />
        </div>
      )}

      <button
        onClick={onDone}
        className="bg-primary hover:bg-primary-hover text-white font-bold
                   px-8 py-4 rounded-2xl transition-all active:scale-95"
      >
        Back to Quizzes
      </button>
    </div>
  );
}
