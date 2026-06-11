import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

const BLANK_QUESTION = () => ({
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  timeLimit: 30,
  optionCount: 4,
});

export default function CreateQuiz() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([BLANK_QUESTION()]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    apiFetch(`/api/quizzes/${id}`)
      .then((quiz) => {
        setTitle(quiz.title);
        setDescription(quiz.description || '');
        setQuestions(
          quiz.questions.map((q) => ({
            text: q.text,
            options: [...q.options, '', '', '', ''].slice(0, 4),
            correctIndex: q.correctIndex,
            explanation: q.explanation || '',
            timeLimit: q.timeLimit,
            optionCount: q.options.length,
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  function updateQuestion(index, field, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  }

  function updateOption(qIndex, oIndex, value) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...q.options];
        opts[oIndex] = value;
        return { ...q, options: opts };
      })
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, BLANK_QUESTION()]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  }

  function removeQuestion(index) {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return setError(`Question ${i + 1} has no text.`);
      const activeOpts = q.options.slice(0, q.optionCount).filter((o) => o.trim());
      if (activeOpts.length < 2) return setError(`Question ${i + 1} needs at least 2 options.`);
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.slice(0, q.optionCount).filter((o) => o.trim()),
          correctIndex: q.correctIndex,
          explanation: q.explanation.trim(),
          timeLimit: Number(q.timeLimit),
        })),
      };

      if (isEditing) {
        await apiFetch(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/quizzes', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate('/teacher/quizzes');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page text-gray-400">Loading quiz…</div>;
  }

  return (
    <div className="min-h-screen bg-bg-base pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur border-b border-bg-border
                         flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/teacher/quizzes" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <h1 className="font-black text-lg">{isEditing ? 'Edit Quiz' : 'New Quiz'}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2
                     rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Quiz'}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3
                          text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Quiz meta */}
        <div className="card mb-6">
          <h2 className="font-bold mb-4">Quiz Details</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Science Chapter 3"
                className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-3
                           text-white placeholder-gray-600 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description for your reference"
                className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-3
                           text-white placeholder-gray-600 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-4">
          {questions.map((q, qi) => (
            <QuestionEditor
              key={qi}
              index={qi}
              question={q}
              total={questions.length}
              onUpdate={(field, val) => updateQuestion(qi, field, val)}
              onUpdateOption={(oi, val) => updateOption(qi, oi, val)}
              onRemove={() => removeQuestion(qi)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="w-full mt-4 py-4 rounded-xl border-2 border-dashed border-bg-border
                     hover:border-primary text-gray-400 hover:text-white transition-colors
                     font-semibold text-sm"
        >
          + Add Question
        </button>
      </main>
    </div>
  );
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = ['text-answer-a', 'text-answer-b', 'text-answer-c', 'text-answer-d'];

function QuestionEditor({ index, question, total, onUpdate, onUpdateOption, onRemove }) {
  return (
    <div className="card">
      {/* Question header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-primary">Question {index + 1}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <label>Time:</label>
            <select
              value={question.timeLimit}
              onChange={(e) => onUpdate('timeLimit', Number(e.target.value))}
              className="bg-bg-base border border-bg-border rounded-lg px-2 py-1 text-white text-sm"
            >
              {[10, 15, 20, 30, 45, 60].map((t) => (
                <option key={t} value={t}>{t}s</option>
              ))}
            </select>
          </div>
          {total > 1 && (
            <button
              onClick={onRemove}
              className="text-gray-500 hover:text-red-400 transition-colors text-sm"
              title="Remove question"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Question text */}
      <textarea
        value={question.text}
        onChange={(e) => onUpdate('text', e.target.value)}
        placeholder="Enter your question here…"
        rows={2}
        className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-3 text-white
                   placeholder-gray-600 focus:outline-none focus:border-primary resize-none mb-4"
      />

      {/* Number of options toggle */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
        <span>Options:</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => {
              onUpdate('optionCount', n);
              if (question.correctIndex >= n) onUpdate('correctIndex', 0);
            }}
            className={`w-8 h-8 rounded-lg font-bold transition-colors
              ${question.optionCount === n
                ? 'bg-primary text-white'
                : 'bg-bg-base border border-bg-border text-gray-400 hover:text-white'}`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Answer options */}
      <div className="flex flex-col gap-2 mb-4">
        {Array.from({ length: question.optionCount }).map((_, oi) => (
          <div key={oi} className="flex items-center gap-3">
            <input
              type="radio"
              name={`correct-${index}`}
              checked={question.correctIndex === oi}
              onChange={() => onUpdate('correctIndex', oi)}
              className="accent-primary w-4 h-4 cursor-pointer flex-shrink-0"
              title="Mark as correct"
            />
            <span className={`font-bold w-5 flex-shrink-0 ${OPTION_COLORS[oi]}`}>
              {OPTION_LABELS[oi]}
            </span>
            <input
              value={question.options[oi]}
              onChange={(e) => onUpdateOption(oi, e.target.value)}
              placeholder={`Option ${OPTION_LABELS[oi]}`}
              className="flex-1 bg-bg-base border border-bg-border rounded-xl px-4 py-2.5
                         text-white placeholder-gray-600 focus:outline-none focus:border-primary text-sm"
            />
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Explanation (shown after reveal — optional)
        </label>
        <input
          value={question.explanation}
          onChange={(e) => onUpdate('explanation', e.target.value)}
          placeholder="Why is this the correct answer?"
          className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-2.5 text-sm
                     text-white placeholder-gray-600 focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
