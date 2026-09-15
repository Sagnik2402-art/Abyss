
import React from 'react';
import { BlockType, BlockType as BT } from '../types';
import { BLOCK_COLORS, BLOCK_NAMES, GAME_CONFIG } from '../constants';
import { Move, Zap, RotateCcw, Pickaxe, SquarePlus, ArrowUp, ArrowDown, Wind } from 'lucide-react';

interface UIOverlayProps {
  joystickRef: React.RefObject<HTMLDivElement>;
  selectedBlock: BlockType;
  setSelectedBlock: (b: BlockType) => void;
  isSprinting: boolean;
  isFlying: boolean;
  onJump: () => void;
  onFlightUp: (active: boolean) => void;
  onFlightDown: (active: boolean) => void;
  onSprintToggle: () => void;
  onBreak: () => void;
  onPlace: () => void;
  fps: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  joystickRef,
  selectedBlock, 
  setSelectedBlock, 
  isSprinting, 
  isFlying,
  onJump, 
  onFlightUp,
  onFlightDown,
  onSprintToggle,
  onBreak,
  onPlace,
  fps
}) => {
  const hotbar = [BT.GRASS, BT.DIRT, BT.STONE, BT.WOOD, BT.LEAVES, BT.GLASS];

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 z-50">
      {/* Top Bar Info */}
      <div className="flex justify-between items-start pointer-events-auto px-4 pt-2">
        <div className="flex gap-4 items-center">
          <div className="bg-black/40 text-white p-2 px-3 rounded-lg text-xs font-mono backdrop-blur-md border border-white/10 shadow-lg">
            VoxelCraft Mobile v3.5<br/>
            FPS: {Math.round(fps)} | Flight: {isFlying ? 'ON' : 'OFF'}
          </div>
          {isFlying && (
            <div className="flex items-center gap-2 bg-blue-500/40 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 animate-pulse">
              <Wind size={14} />
              <span>Flying Mode</span>
            </div>
          )}
        </div>
        
        <button 
          onPointerDown={(e) => { e.stopPropagation(); if(confirm("Reset world?")) { localStorage.removeItem('voxel_world_v3'); window.location.reload(); } }}
          className="p-3 bg-red-500/40 text-white rounded-full shadow-lg active:scale-90 transition-transform backdrop-blur-md border border-white/20"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-2 border-white/40 rounded-full flex items-center justify-center">
        <div className="w-1 h-1 bg-white rounded-full"></div>
      </div>

      {/* Bottom Interface Grid */}
      <div className="w-full px-6 mb-4 grid grid-cols-3 items-end">
        
        {/* Left: Joystick */}
        <div className="flex justify-start pointer-events-auto">
           <div 
             ref={joystickRef} 
             className="joystick-zone bg-white/5 rounded-full border border-white/5 mb-2"
           />
        </div>

        {/* Center: Hotbar */}
        <div className="flex flex-col items-center gap-2 mb-2 pointer-events-auto">
           <div className="bg-black/40 px-3 py-1 rounded-full text-[10px] text-white font-bold tracking-widest uppercase backdrop-blur-md border border-white/10">
             {BLOCK_NAMES[selectedBlock]}
           </div>
           <div className="flex bg-black/40 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 gap-2 shadow-2xl">
             {hotbar.map((type) => (
               <button
                 key={type}
                 onPointerDown={(e) => { e.stopPropagation(); setSelectedBlock(type); }}
                 className={`w-12 h-12 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                   selectedBlock === type ? 'border-yellow-400 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-transparent opacity-70'
                 }`}
                 style={{ backgroundColor: BLOCK_COLORS[type] }}
               />
             ))}
           </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col items-end gap-3 mb-2 pointer-events-auto">
          <div className="flex gap-3">
             <button 
              onPointerDown={(e) => { e.stopPropagation(); onPlace(); }}
              className="p-5 bg-green-500/40 backdrop-blur-md text-white rounded-2xl shadow-xl active:scale-95 border border-white/20"
            >
              <SquarePlus size={28} />
            </button>
            <button 
              onPointerDown={(e) => { e.stopPropagation(); onBreak(); }}
              className="p-5 bg-orange-600/40 backdrop-blur-md text-white rounded-2xl shadow-xl active:scale-95 border border-white/20"
            >
              <Pickaxe size={28} />
            </button>
          </div>
          
          <div className="flex gap-3">
            <button 
              onPointerDown={(e) => { e.stopPropagation(); onSprintToggle(); }}
              className={`p-5 rounded-full shadow-xl transition-all border border-white/20 backdrop-blur-md ${isSprinting ? 'bg-yellow-500/40 text-black' : 'bg-white/10 text-white'}`}
            >
              <Zap size={24} />
            </button>
            
            <div className="flex flex-col gap-2">
              {isFlying && (
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); onFlightDown(true); }}
                  onPointerUp={(e) => { e.stopPropagation(); onFlightDown(false); }}
                  onPointerLeave={(e) => { e.stopPropagation(); onFlightDown(false); }}
                  className="p-4 bg-gray-500/40 backdrop-blur-md text-white rounded-full shadow-xl active:scale-95 border border-white/20"
                >
                  <ArrowDown size={24} />
                </button>
              )}
              <button 
                onPointerDown={(e) => { 
                  e.stopPropagation(); 
                  onJump(); 
                  if(isFlying) onFlightUp(true);
                }}
                onPointerUp={(e) => { e.stopPropagation(); if(isFlying) onFlightUp(false); }}
                onPointerLeave={(e) => { e.stopPropagation(); if(isFlying) onFlightUp(false); }}
                className={`p-6 backdrop-blur-md text-white rounded-full shadow-xl active:scale-95 border border-white/20 ${isFlying ? 'bg-blue-600/60' : 'bg-blue-500/40'}`}
              >
                {isFlying ? <ArrowUp size={28} /> : <Move size={28} className="rotate-45" />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UIOverlay;
