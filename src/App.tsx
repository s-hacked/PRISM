import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import AssistantDrawer from './components/AssistantDrawer';
import OverviewPage from './pages/OverviewPage';
import ChurnRiskPage from './pages/ChurnRiskPage';
import CustomersPage from './pages/CustomersPage';
import ForecastPage from './pages/ForecastPage';
import ModelHealthPage from './pages/ModelHealthPage';
import DataManagementPage from './pages/DataManagementPage';
import ReportsPage from './pages/ReportsPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import { api } from './services/api';

export default function App() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30000,
  });
  const lastUpdated = health?.lastUpdated ?? Date.now();

  if (isAuthPage) {
    return (
      <div className="min-h-screen">
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar collapsed={railCollapsed} onToggle={() => setRailCollapsed((c) => !c)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onOpenAssistant={() => setAssistantOpen(true)} lastUpdated={lastUpdated} />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/churn" element={<ChurnRiskPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/model-health" element={<ModelHealthPage />} />
            <Route path="/data" element={<DataManagementPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </div>

      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}