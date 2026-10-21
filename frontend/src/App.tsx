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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-[#f4f6f8] text-[#1a2b4a] font-sans antialiased">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Center + Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />

            <div className="flex-1 flex flex-col overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/events" element={<MyEvents />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/ai-workspace" element={<AIWorkspace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
