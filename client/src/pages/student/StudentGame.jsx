/**
 * StudentGame.jsx
 * Single page that drives the entire student game experience:
 *   joining → lobby → question → answered → revealing → finished
 *
 * Socket events listened to:
 *   game:joined, game:started, game:question, game:time_tick,
 *   game:answer_ack, game:answer_result, game:question_end,
 *   game:student_final, game:ended, game:error, game:kicked, game:host_disconnect, game:rejoined
 *
 * Socket events emitted:
 *   player:join, player:rejoin, player:answer
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../context/SocketContext';
import { useCountdown } from '../../hooks/useCountdown';
import AnswerTile from '../../components/student/AnswerTile';
import CountdownRing from '../../components/ui/CountdownRing';
import Leaderboard from '../../components/ui/Leaderboard';

export default function StudentGame() {
  const { gameCode } = useParams();
  const { connect } = useSocketContext();
  const navigate = useNavigate();
  const { secondsLeft, start: startCountdown, syncFromServer, stop: stopCountdown } = useCountdown();

  const socketRef = useRef(null);

  const [phase, setPhase] = useState('joining');
  // joining | lobby | question | answered | revealing | finished | error | kicked

  const [displayName, setDisplayName] = useState('');
  const [playerCount, setPlayerCount] = useState(0);
  const [quizTitle, setQuizTitle] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [myAnswer, setMyAnswer] = useState(null); // answerIndex | null
  const [answerResult, setAnswerResult] = useState(null); // { correct, points, totalScore, rank }

  const [revealData, setRevealData] = useState(null); // { correctIndex, optionCounts, leaderboard }
  const [personalReveal, setPersonalReveal] = useState(null); // same as answerResult but post-reveal

  const [finalResult, setFinalResult] = useState(null); // { rank, score, totalPlayers, displayName }
  const [leaderboard, setLeaderboard] = useState([]);

  const [error, setError] = useState('');

  // Retrieve stored identity
  const emailRef = useRef(sessionStorage.getItem('quiz_email') || '');
  const code = gameCode.toUpperCase();

  useEffect(() => {
    if (!emailRef.current) {
      navigate(`/join`);
      return;
    }

    const socket = connect();
    socketRef.current = socket;

    // Join or rejoin
    socket.emit('player:join', { gameCode: code, email: emailRef.current });

    socket.on('game:joined', (data) => {
      setDisplayName(data.displayName);
      setPlayerCount(data.playerCount);
      setQuizTitle(data.quizTitle);
      setPhase('lobby');
    });

    // Handle rejoin (e.g. page refresh mid-game)
    socket.on('game:rejoined', (data) => {
      setDisplayName(data.displayName);
      setTotalQuestions(data.totalQuestions);
      if (data.status === 'lobby') {
        setPhase('lobby');
      } else if (data.status === 'question' && data.question) {
        const q = data.question;
        setCurrentQuestion(q);
        setQuestionIndex(q.index);
        if (q.alreadyAnswered) {
          setPhase('answered');
        } else {
          setPhase('question');
          startCountdown(q.secondsLeft);
        }
      } else if (data.status === 'revealing') {
        setPhase('revealing');
      } else if (data.status === 'finished') {
        setPhase('finished');
      }
    });

    socket.on('game:started', ({ totalQuestions }) => {
      setTotalQuestions(totalQuestions);
      setPhase('starting');
    });

    socket.on('game:question', (q) => {
      setCurrentQuestion(q);
      setQuestionIndex(q.index);
      setMyAnswer(null);
      setAnswerResult(null);
      setRevealData(null);
      setPersonalReveal(null);
      setPhase('question');
      startCountdown(q.timeLimit);
    });

    socket.on('game:time_tick', ({ secondsLeft }) => syncFromServer(secondsLeft));

    socket.on('game:answer_ack', () => {
      stopCountdown();
      setPhase('answered');
    });

    socket.on('game:answer_result', (result) => {
      setPersonalReveal(result);
      setAnswerResult(result);
    });

    socket.on('game:question_end', (data) => {
      stopCountdown();
      setRevealData(data);
      setLeaderboard(data.leaderboard || []);
      setPhase('revealing');
    });

    socket.on('game:student_final', (result) => {
      setFinalResult(result);
    });

    socket.on('game:ended', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
      setPhase('finished');
    });

    socket.on('game:error', ({ message }) => {
      setError(message);
      setPhase('error');
    });

    socket.on('game:kicked', ({ message }) => {
      setError(message);
      setPhase('kicked');
    });

    socket.on('game:host_disconnect', ({ message }) => {
      setError(message || 'Host disconnected.');
      // Don't change phase yet — wait in case host reconnects
    });

    return () => {
      ['game:joined', 'game:rejoined', 'game:started', 'game:question',
       'game:time_tick', 'game:answer_ack', 'game:answer_result',
       'game:question_end', 'game:student_final', 'game:ended',
       'game:error', 'game:kicked', 'game:host_disconnect'].forEach((e) =>
        socket.off(e)
      );
    };
  }, [code]);

  function submitAnswer(answerIndex) {
    if (phase !== 'question' || myAnswer !== null) return;
    setMyAnswer(answerIndex);
    socketRef.current?.emit('player:answer', { gameCode: code, answerIndex });
  }

  /* ── Render phases ─────────────────────────────────────────── */

  if (phase === 'joining') {
    return (
      <div className="page">
        <p className="text-gray-400 animate-pulse">Connecting…</p>
      </div>
    );
  }

  if (phase === 'error' || phase === 'kicked') {
    return (
      <div className="page">
        <div className="card text-center max-w-xs">
          <p className="text-4xl mb-3">{phase === 'kicked' ? '🚫' : '⚠️'}</p>
          <p className="text-white font-bold mb-2">{error}</p>
          <button
            onClick={() => navigate('/join')}
            className="mt-4 bg-primary hover:bg-primary-hover text-white font-bold
                       px-6 py-3 rounded-xl transition-all text-sm"
          >
            Try Another Game
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'lobby' || phase === 'starting') {
    return (
      <div className="page">
        <div className="text-center animate-fade-in max-w-xs w-full">
          <div className="text-6xl mb-6">{phase === 'starting' ? '🚀' : '⏳'}</div>
          <h1 className="text-2xl font-black mb-1">
            {phase === 'starting' ? 'Get Ready!' : 'Waiting for teacher…'}
          </h1>
          {quizTitle && <p className="text-primary-light mb-2">{quizTitle}</p>}
          <div className="card mt-6">
            <p className="text-4xl font-black text-white">{displayName}</p>
            <p className="text-gray-400 text-sm mt-1">You're in!</p>
          </div>
          <p className="text-gray-500 text-sm mt-4">{playerCount} player{playerCount !== 1 ? 's' : ''} in lobby</p>
          {error && <p className="text-yellow-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  if (phase === 'question') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col">
        {/* Timer bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-xs text-gray-500">
            Q{questionIndex + 1}/{totalQuestions}
          </span>
          <CountdownRing total={currentQuestion.timeLimit} remaining={secondsLeft} size={64} />
        </div>

        {/* Read the question on the projector */}
        <div className="text-center px-4 py-3">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Read the question on the projector</p>
        </div>

        {/* Answer grid — fills remaining height */}
        <div className="flex-1 grid grid-cols-2 gap-3 p-4">
          {currentQuestion.options.map((opt, i) => (
            <AnswerTile
              key={i}
              index={i}
              label={opt}
              onClick={() => submitAnswer(i)}
              disabled={myAnswer !== null}
              selected={myAnswer === i}
            />
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'answered') {
    return (
      <div className="page">
        <div className="text-center animate-pop max-w-xs w-full">
          <div className="text-7xl mb-4">🔒</div>
          <h2 className="text-2xl font-black mb-1">Locked in!</h2>
          <p className="text-gray-400">Waiting for the reveal…</p>
          {myAnswer !== null && currentQuestion && (
            <div className="mt-6 card">
              <p className="text-sm text-gray-400 mb-1">Your answer</p>
              <p className="font-bold text-primary-light">{currentQuestion.options[myAnswer]}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'revealing') {
    const correct = personalReveal?.correct;
    const points = personalReveal?.points ?? 0;
    const totalScore = personalReveal?.totalScore ?? 0;
    const rank = personalReveal?.rank;
    const answered = personalReveal?.answered !== false;

    return (
      <div className="page">
        <div className="text-center animate-slide-up max-w-xs w-full">
          {!answered ? (
            <>
              <div className="text-6xl mb-3">⏰</div>
              <h2 className="text-2xl font-black text-yellow-400">Time's Up!</h2>
              <p className="text-gray-400 mt-1">You didn't answer in time</p>
            </>
          ) : (
            <>
              <div className="text-7xl mb-3">{correct ? '✅' : '❌'}</div>
              <h2 className={`text-3xl font-black mb-1 ${correct ? 'text-green-400' : 'text-red-400'}`}>
                {correct ? 'Correct!' : 'Wrong!'}
              </h2>
              {correct && (
                <p className="text-2xl font-black text-primary-light">+{points.toLocaleString()} pts</p>
              )}
            </>
          )}

          <div className="card mt-6 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Total Score</span>
              <span className="font-black text-white">{totalScore.toLocaleString()}</span>
            </div>
            {rank && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rank</span>
                <span className="font-black text-primary-light">#{rank}</span>
              </div>
            )}
          </div>

          {revealData?.explanation && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-sm text-primary-light text-left">
              💡 {revealData.explanation}
            </div>
          )}

          <p className="text-gray-500 text-sm mt-4">Waiting for next question…</p>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const myEntry = leaderboard.find((p) => p.email === emailRef.current);
    const myRank = finalResult?.rank ?? myEntry?.rank;
    const myScore = finalResult?.score ?? myEntry?.score ?? 0;
    const totalPlayers = finalResult?.totalPlayers ?? leaderboard.length;
    const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center px-4 py-8">
        <div className="text-center mb-8 animate-slide-up">
          <div className="text-6xl mb-3">{MEDAL[myRank] || '🎉'}</div>
          <h1 className="text-4xl font-black">
            {myRank <= 3 ? `${['', '1st', '2nd', '3rd'][myRank]} Place!` : `Rank #${myRank}`}
          </h1>
          <p className="text-primary-light text-xl font-bold mt-1">
            {myScore.toLocaleString()} points
          </p>
          <p className="text-gray-400 text-sm mt-1">out of {totalPlayers} player{totalPlayers !== 1 ? 's' : ''}</p>
        </div>

        <div className="w-full max-w-xs mb-6">
          <Leaderboard entries={leaderboard} highlightEmail={emailRef.current} />
        </div>

        <button
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-primary-hover text-white font-bold
                     px-8 py-4 rounded-2xl transition-all active:scale-95"
        >
          Play Again
        </button>
      </div>
    );
  }

  return null;
}
