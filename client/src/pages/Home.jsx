import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="page bg-bg-base">
      <div className="w-full max-w-md text-center animate-fade-in">
        {/* Logo / Brand */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-4 glow">
            <span className="text-4xl">⚡</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">QuizWave</h1>
          <p className="text-primary-light mt-2 text-lg">Live classroom quizzes, real-time</p>
        </div>

        {/* Role buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() =>
              navigate(isAuthenticated ? '/teacher/quizzes' : '/teacher/login')
            }
            className="w-full py-5 rounded-2xl bg-primary hover:bg-primary-hover font-bold text-xl
                       text-white transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-white"
          >
            🎓 I'm a Teacher
          </button>

          <button
            onClick={() => navigate('/join')}
            className="w-full py-5 rounded-2xl bg-bg-card border-2 border-bg-border
                       hover:border-primary font-bold text-xl text-white
                       transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
          >
            🎮 I'm a Student
          </button>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Self-hosted · No accounts needed for students
        </p>
      </div>
    </div>
  );
}
