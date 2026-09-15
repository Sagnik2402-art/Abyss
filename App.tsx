
import React, { useState } from 'react';
import GameView from './components/GameView';
import HomeMenu from './components/HomeMenu';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');

  return (
    <div className="w-full h-full">
      {gameState === 'menu' ? (
        <HomeMenu onPlay={() => setGameState('playing')} />
      ) : (
        <GameView />
      )}
    </div>
  );
};

export default App;
