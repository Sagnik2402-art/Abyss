
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import nipplejs from 'nipplejs';
import { World } from '../engine/World';
import { Player } from '../engine/Player';
import { BlockType } from '../types';
import { GAME_CONFIG } from '../constants';
import UIOverlay from './UIOverlay';

const GameView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  
  // Engine Refs
  const worldRef = useRef<World | null>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const inputRef = useRef({ move: new THREE.Vector2(0, 0), jump: false, up: false, down: false, sprint: false });
  const selectedBlockRef = useRef<BlockType>(BlockType.GRASS);
  const lastJumpTime = useRef<number>(0);
  
  // Look Control Refs
  const lookState = useRef({
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0
  });

  // UI State
  const [selectedBlockUI, setSelectedBlockUI] = useState<BlockType>(BlockType.GRASS);
  const [isSprintingUI, setIsSprintingUI] = useState(false);
  const [isFlyingUI, setIsFlyingUI] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    selectedBlockRef.current = selectedBlockUI;
  }, [selectedBlockUI]);

  const performAction = useCallback((action: 'break' | 'place') => {
    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player || !camera) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const targets = world.getRaycastTargets();
    const intersects = raycaster.intersectObjects(targets);
    
    if (intersects.length > 0 && intersects[0].distance < GAME_CONFIG.REACH_DISTANCE) {
      const hit = intersects[0];
      if (hit.face) {
        if (action === 'break') {
          const bPos = hit.point.clone().sub(hit.face.normal.clone().multiplyScalar(0.4)).round();
          world.setBlock(bPos.x, bPos.y, bPos.z, BlockType.AIR);
          if (navigator.vibrate) navigator.vibrate(40);
        } else if (action === 'place') {
          const pPos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.4)).round();
          // Check collision with player volume (2 blocks high)
          const playerMin = player.position.clone().sub(new THREE.Vector3(0.3, 0, 0.3));
          const playerMax = player.position.clone().add(new THREE.Vector3(0.3, 2.0, 0.3));
          
          const isIntersectingPlayer = (
            pPos.x >= Math.floor(playerMin.x) && pPos.x <= Math.floor(playerMax.x) &&
            pPos.y >= Math.floor(playerMin.y) && pPos.y <= Math.floor(playerMax.y) &&
            pPos.z >= Math.floor(playerMin.z) && pPos.z <= Math.floor(playerMax.z)
          );

          if (!isIntersectingPlayer) {
            world.setBlock(pPos.x, pPos.y, pPos.z, selectedBlockRef.current);
            if (navigator.vibrate) navigator.vibrate(20);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !joystickRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87CEEB'); 
    scene.fog = new THREE.Fog(scene.background, 35, 80);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(10, 50, 10);
    scene.add(sun);

    const world = new World(scene);
    const player = new Player(camera, world);
    worldRef.current = world;
    playerRef.current = player;

    const joystickManager = nipplejs.create({
      zone: joystickRef.current,
      mode: 'static',
      position: { left: '70px', top: '70px' },
      color: 'white',
      size: 110,
      threshold: 0.1
    });

    joystickManager.on('move', (_, data) => {
      // Map vector directly: data.vector.y > 0 means stick is pushed UP (forward)
      if (data.vector) {
        inputRef.current.move.set(data.vector.x, data.vector.y);
      }
    });

    joystickManager.on('end', () => {
      inputRef.current.move.set(0, 0);
    });

    const handlePointerDown = (e: PointerEvent) => {
      if (lookState.current.pointerId !== null) return;
      if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
      lookState.current.pointerId = e.pointerId;
      lookState.current.lastX = e.clientX;
      lookState.current.lastY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== lookState.current.pointerId) return;
      const dx = e.clientX - lookState.current.lastX;
      const dy = e.clientY - lookState.current.lastY;
      const sensitivity = 0.005;
      player.rotation.y -= dx * sensitivity;
      player.rotation.x -= dy * sensitivity;
      player.rotation.x = Math.max(-1.5, Math.min(1.5, player.rotation.x));
      lookState.current.lastX = e.clientX;
      lookState.current.lastY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId === lookState.current.pointerId) {
        lookState.current.pointerId = null;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = 0;
    
    const animate = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      frameCount++;
      fpsTime += dt;
      if (fpsTime >= 1) {
        setFps(Math.round(frameCount / fpsTime));
        frameCount = 0;
        fpsTime = 0;
      }
      player.update(dt, inputRef.current);
      inputRef.current.jump = false; 
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    const reqId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      joystickManager.destroy();
      renderer.dispose();
    };
  }, []);

  const onJump = useCallback(() => { 
    const now = performance.now();
    const diff = now - lastJumpTime.current;
    if (diff < 300) {
      if (playerRef.current) {
        playerRef.current.isFlying = !playerRef.current.isFlying;
        setIsFlyingUI(playerRef.current.isFlying);
        if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
      }
    }
    lastJumpTime.current = now;
    inputRef.current.jump = true; 
  }, []);

  const onFlightUp = useCallback((active: boolean) => { inputRef.current.up = active; }, []);
  const onFlightDown = useCallback((active: boolean) => { inputRef.current.down = active; }, []);

  const onSprintToggle = useCallback(() => { 
    setIsSprintingUI(prev => {
      const newVal = !prev;
      inputRef.current.sprint = newVal;
      return newVal;
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87CEEB] touch-none">
      <div ref={containerRef} className="w-full h-full" />
      <UIOverlay 
        joystickRef={joystickRef}
        selectedBlock={selectedBlockUI} 
        setSelectedBlock={setSelectedBlockUI}
        isSprinting={isSprintingUI}
        isFlying={isFlyingUI}
        onJump={onJump}
        onFlightUp={onFlightUp}
        onFlightDown={onFlightDown}
        onSprintToggle={onSprintToggle}
        onBreak={() => performAction('break')}
        onPlace={() => performAction('place')}
        fps={fps}
      />
    </div>
  );
};

export default GameView;
