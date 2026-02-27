import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { GameScreen } from '@/components/game/GameScreen';
import { Join } from '@/pages/Join';
import { StatsPage } from '@/pages/StatsPage';
import { PostGameSummary } from '@/pages/PostGameSummary';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameScreen />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/game-stats" element={<PostGameSummary />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
