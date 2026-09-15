
import * as THREE from 'three';
import { World } from './World';
import { BlockType } from '../types';
import { GAME_CONFIG } from '../constants';

export class Player {
  public position = new THREE.Vector3(GAME_CONFIG.WORLD_SIZE / 2, GAME_CONFIG.WORLD_HEIGHT + 2, GAME_CONFIG.WORLD_SIZE / 2);
  public velocity = new THREE.Vector3(0, 0, 0);
  public rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  public onGround = false;
  public isFlying = false;
  private camera: THREE.PerspectiveCamera;
  private world: World;

  // Exact collision box dimensions
  private width = GAME_CONFIG.PLAYER_WIDTH; 
  private height = GAME_CONFIG.PLAYER_HEIGHT; // 2.0 blocks

  constructor(camera: THREE.PerspectiveCamera, world: World) {
    this.camera = camera;
    this.world = world;
  }

  public update(dt: number, input: { move: THREE.Vector2; jump: boolean; up: boolean; down: boolean; sprint: boolean }) {
    // 1. Sync camera rotation
    this.camera.rotation.copy(this.rotation);

    // 2. Horizontal Movement Calculation
    // We treat input.move.y as forward (standard nipplejs behavior)
    const moveDir = new THREE.Vector3(input.move.x, 0, -input.move.y);
    
    if (moveDir.length() > 0.1) {
      if (moveDir.length() > 1) moveDir.normalize();
      moveDir.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
      
      const baseSpeed = this.isFlying ? GAME_CONFIG.FLY_SPEED : GAME_CONFIG.MOVE_SPEED;
      const sprintMod = input.sprint ? (this.isFlying ? GAME_CONFIG.FLY_MULTIPLIER : GAME_CONFIG.SPRINT_MULTIPLIER) : 1;
      const speed = baseSpeed * sprintMod;

      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // 3. Vertical Movement
    if (this.isFlying) {
      let vMove = 0;
      if (input.up) vMove += 1;
      if (input.down) vMove -= 1;
      this.velocity.y = vMove * (GAME_CONFIG.FLY_SPEED * (input.sprint ? 2 : 1));
      this.onGround = false;
    } else {
      if (this.onGround) {
        this.velocity.y = 0;
        if (input.jump) {
          this.velocity.y = GAME_CONFIG.JUMP_FORCE;
          this.onGround = false;
        }
      } else {
        this.velocity.y += GAME_CONFIG.GRAVITY * dt;
      }
    }

    // 4. Axis-Independent Physics Integration
    this.applyPhysics(dt);
    
    // 5. Update Camera Position (Standard eye level at 1.8 blocks)
    this.camera.position.copy(this.position).add(new THREE.Vector3(0, this.height - 0.2, 0));
  }

  private applyPhysics(dt: number) {
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;
    const nextY = this.position.y + this.velocity.y * dt;

    // Process X
    this.position.x = nextX;
    if (this.isColliding()) {
      // Auto Jump Check
      if (!this.isFlying && this.onGround && this.canAutoJump()) {
        this.velocity.y = GAME_CONFIG.JUMP_FORCE;
        this.onGround = false;
      } else {
        this.position.x -= this.velocity.x * dt;
        this.velocity.x = 0;
      }
    }

    // Process Z
    this.position.z = nextZ;
    if (this.isColliding()) {
      // Auto Jump Check
      if (!this.isFlying && this.onGround && this.canAutoJump()) {
        this.velocity.y = GAME_CONFIG.JUMP_FORCE;
        this.onGround = false;
      } else {
        this.position.z -= this.velocity.z * dt;
        this.velocity.z = 0;
      }
    }

    // Process Y (Vertical)
    this.position.y = nextY;
    if (this.isColliding()) {
      if (this.velocity.y < 0) {
        // Landed
        this.position.y = Math.ceil(this.position.y);
        if (!this.isFlying) this.onGround = true;
      } else {
        // Hit ceiling
        this.position.y = Math.floor(this.position.y);
      }
      this.velocity.y = 0;
    } else if (!this.isFlying) {
      this.checkGrounded();
    }

    // World bounds safety
    if (this.position.y < -10) {
      this.position.set(GAME_CONFIG.WORLD_SIZE / 2, GAME_CONFIG.WORLD_HEIGHT + 2, GAME_CONFIG.WORLD_SIZE / 2);
      this.velocity.set(0, 0, 0);
      this.isFlying = false;
    }
  }

  private canAutoJump(): boolean {
    const originalY = this.position.y;
    this.position.y += 1.1; // Check if head is clear if we jump up 1 block
    const isPathClear = !this.isColliding();
    this.position.y = originalY;
    return isPathClear;
  }

  private checkGrounded() {
    const prevY = this.position.y;
    this.position.y -= 0.1;
    if (this.isColliding()) {
      this.onGround = true;
      this.position.y = Math.ceil(this.position.y);
    } else {
      this.onGround = false;
    }
    this.position.y = prevY;
  }

  private isColliding(): boolean {
    const halfW = this.width / 2;
    const epsilon = 0.05; // Sufficient padding to avoid mathematical precision errors

    const minX = Math.floor(this.position.x - halfW + epsilon);
    const maxX = Math.floor(this.position.x + halfW - epsilon);
    const minY = Math.floor(this.position.y + epsilon);
    const maxY = Math.floor(this.position.y + this.height - epsilon);
    const minZ = Math.floor(this.position.z - halfW + epsilon);
    const maxZ = Math.floor(this.position.z + halfW - epsilon);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.world.getBlock(x, y, z);
          if (block !== BlockType.AIR) return true;
        }
      }
    }
    return false;
  }
}
