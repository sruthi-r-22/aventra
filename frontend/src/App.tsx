import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
import MyEvents from './pages/MyEvents';
import Budget from './pages/Budget';
import Timeline from './pages/Timeline';
import Tasks from './pages/Tasks';
import Vendors from './pages/Vendors';
import AIWorkspace from './pages/AIWorkspace';
import LandingPage from './pages/LandingPage';
import Settings from './pages/Settings';
import { Lock } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, openAuthModal } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-7 h-7 border-2 border-[#164B3D]/20 border-t-[#164B3D] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
        <div className="bg-white rounded-3xl border border-[#E2E6DC] p-10 max-w-md w-full text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-black text-[#17252B] tracking-tight mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Please sign in to your Aventra account to access your event workspace, budget calculations, and PlanForge schedules.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full py-2.5 bg-[#164B3D] hover:bg-[#103D32] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppLayout({ children, hideTopbar }: { children: React.ReactNode; hideTopbar?: boolean }) {
  return (
    <div className="flex min-h-screen bg-[#FAF9F5] text-[#17252B] font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Center + Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!hideTopbar && <Topbar />}

        <div className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AuthModal />
          <Routes>
            {/* Welcome / Landing page — 100% public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* Internal Workspace App routes — Protected */}
            <Route
              path="/dashboard"
              element={
                <AppLayout hideTopbar={true}>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/events"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <MyEvents />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/budget"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <Budget />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/timeline"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <Timeline />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/tasks"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/vendors"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <Vendors />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/ai-workspace"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <AIWorkspace />
                  </ProtectedRoute>
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                </AppLayout>
              }
            />

            {/* Catch-all redirect to welcome / landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
