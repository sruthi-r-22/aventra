import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import MyEvents from './pages/MyEvents';
import Budget from './pages/Budget';
import Timeline from './pages/Timeline';
import Tasks from './pages/Tasks';
import Vendors from './pages/Vendors';
import AIWorkspace from './pages/AIWorkspace';
import LandingPage from './pages/LandingPage';

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
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Welcome / Landing page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Internal Workspace App routes */}
          <Route path="/dashboard" element={<AppLayout hideTopbar={true}><Dashboard /></AppLayout>} />
          <Route path="/events" element={<AppLayout><MyEvents /></AppLayout>} />
          <Route path="/budget" element={<AppLayout><Budget /></AppLayout>} />
          <Route path="/timeline" element={<AppLayout><Timeline /></AppLayout>} />
          <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
          <Route path="/vendors" element={<AppLayout><Vendors /></AppLayout>} />
          <Route path="/ai-workspace" element={<AppLayout><AIWorkspace /></AppLayout>} />

          {/* Catch-all redirect to welcome / landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
