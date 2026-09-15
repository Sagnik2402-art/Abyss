
import { BlockType } from './types';

export const GAME_CONFIG = {
  WORLD_SIZE: 64,
  WORLD_HEIGHT: 32,
  GRAVITY: -24, // Slightly stronger gravity for better feel
  JUMP_FORCE: 9,
  MOVE_SPEED: 5,
  FLY_SPEED: 10,
  SPRINT_MULTIPLIER: 1.6,
  FLY_MULTIPLIER: 2.2,
  PLAYER_HEIGHT: 2.0, // Exactly 2 blocks tall
  PLAYER_WIDTH: 0.6,
  REACH_DISTANCE: 6,
};

export const BLOCK_COLORS: Record<BlockType, string> = {
  [BlockType.AIR]: 'transparent',
  [BlockType.GRASS]: '#5ea342',
  [BlockType.DIRT]: '#8b5a2b',
  [BlockType.STONE]: '#7a7a7a',
  [BlockType.WOOD]: '#5d4037',
  [BlockType.LEAVES]: '#2e7d32',
  [BlockType.GLASS]: '#90caf9'
};

export const BLOCK_NAMES: Record<BlockType, string> = {
  [BlockType.AIR]: 'Air',
  [BlockType.GRASS]: 'Grass',
  [BlockType.DIRT]: 'Dirt',
  [BlockType.STONE]: 'Stone',
  [BlockType.WOOD]: 'Wood',
  [BlockType.LEAVES]: 'Leaves',
  [BlockType.GLASS]: 'Glass'
};
