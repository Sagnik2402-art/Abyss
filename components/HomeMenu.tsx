
import React from 'react';
import { Play, TabletSmartphone } from 'lucide-react';

interface HomeMenuProps {
  onPlay: () => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onPlay }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#87CEEB] overflow-hidden">
      {/* Decorative background blocks */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="grid grid-cols-8 gap-4 p-4">
          {Array.from({ length: 32 }).map((_, i) => (
            <div 
              key={i} 
              className="w-full aspect-square bg-white/20 rounded-lg shadow-inner"
              style={{ transform: `rotate(${Math.random() * 20 - 10}deg) scale(${0.8 + Math.random() * 0.4})` }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-7xl font-black text-white drop-shadow-[0_8px_0_#2d6a4f] tracking-tighter">
            VOXEL<span className="text-[#5ea342]">CRAFT</span>
          </h1>
          <p className="text-white/80 font-mono tracking-widest text-sm uppercase mt-2 font-bold bg-black/10 px-4 py-1 rounded-full">
            Mobile Landscape Edition v3.2
          </p>
        </div>

        <div className="flex flex-col gap-4 w-64 items-center">
          <button 
            onClick={onPlay}
            className="group relative w-full flex items-center justify-center gap-3 bg-[#5ea342] hover:bg-[#4d8b36] text-white py-6 px-8 rounded-2xl text-2xl font-black shadow-[0_10px_0_#2d6a4f] active:shadow-none active:translate-y-[10px] transition-all"
          >
            <Play fill="white" className="group-hover:scale-110 transition-transform" />
            PLAY GAME
          </button>
          
          <div className="flex items-center gap-2 text-white/90 font-bold text-xs bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm mt-2">
            <TabletSmartphone size={16} className="rotate-90 animate-bounce" />
            <span>PLEASE ROTATE TO LANDSCAPE VIEW</span>
          </div>
        </div>

        <div className="mt-8 text-white/40 text-[10px] font-mono flex flex-col items-center gap-1">
          <span>PROCEDURAL TERRAIN • 16³ CHUNKING • MULTI-TOUCH LOOK</span>
          <span>AUTOSAVE ENABLED</span>
        </div>
      </div>
    </div>
  );
};

export default HomeMenu;
