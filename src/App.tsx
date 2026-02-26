import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { GameScreen } from '@/components/game/GameScreen';
import { Join } from '@/pages/Join';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameScreen />} />
          <Route path="/join/:code" element={<Join />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
