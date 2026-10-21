import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import GameDetail from './pages/GameDetail';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';
import Lobby from './pages/Lobby';
import Login from './pages/Login';
import RoomPage from './pages/RoomPage';
import { getSocket, reconnectSocket, useGame } from './socket';
import { Toaster } from './toast';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (user) getSocket();
  }, [user]);
  if (loading) return <main className="page narrow">Đang tải…</main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return (
    <>
      <ConnectionBanner />
      {children}
    </>
  );
}

function ConnectionBanner() {
  const game = useGame();
  if (game.replaced) {
    return (
      <div className="banner">
        Bạn đã mở game ở tab khác.{' '}
        <button className="link" onClick={reconnectSocket}>
          Dùng ở tab này
        </button>
      </div>
    );
  }
  if (game.ready && !game.connected) return <div className="banner">Đang kết nối lại…</div>;
  return null;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Lobby /></RequireAuth>} />
            <Route path="/room/:code" element={<RequireAuth><RoomPage /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
            <Route path="/games/:id" element={<RequireAuth><GameDetail /></RequireAuth>} />
            <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
