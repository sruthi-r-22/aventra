import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    register,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authModalMode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        await register(email, password, name);
      }
      // Reset form on success
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode: 'login' | 'register') => {
    setError(null);
    setAuthModalMode(mode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!loading) setShowAuthModal(false);
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E3E8E2] relative flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setShowAuthModal(false)}
          className="absolute right-5 top-5 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center mb-4">
          <Sparkles size={22} className="text-[#164B3D]" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-[#17252B] tracking-tight">
          {authModalMode === 'login' ? 'Welcome back to Aventra' : 'Create your Aventra account'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {authModalMode === 'login'
            ? 'Sign in to access your events, budgets, and PlanForge schedules.'
            : 'Start planning intelligent, constraint-optimized celebrations today.'}
        </p>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#F4F6F2] p-1 rounded-xl mt-5 mb-5 border border-gray-100">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authModalMode === 'login'
                ? 'bg-white text-[#164B3D] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authModalMode === 'register'
                ? 'bg-white text-[#164B3D] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#164B3D] hover:bg-[#103D32] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{authModalMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-[11px] text-gray-400 text-center mt-5">
          {authModalMode === 'login' ? (
            <>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-[#164B3D] font-bold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[#164B3D] font-bold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
