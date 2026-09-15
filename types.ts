
export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  GLASS = 6
}

export interface VoxelData {
  [key: string]: BlockType;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Config {
  worldSize: number;
  worldHeight: number;
  chunkSize: number;
}
