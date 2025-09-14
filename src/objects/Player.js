import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/constants.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, ASSET_KEYS.PLAYER, 'down_0');
    this.lastFacing = 'down';
    this.baseSpeed = 120;
    this.setOrigin(0.5, 0.7);
  }

  initBody() {
    // Tight body for top-down collisions
    this.body.setSize(16, 18);
    this.body.setOffset(8, 10);
  }

  updateMovement(dir, sprint) {
    const speed = this.baseSpeed * (sprint ? 1.5 : 1);
    this.body.setVelocity(dir.x * speed, dir.y * speed);
    // Prevent tiny residual velocity
    if (dir.x === 0) this.body.setVelocityX(0);
    if (dir.y === 0) this.body.setVelocityY(0);
    this._updateAnimation(dir);
  }

  _updateAnimation(dir) {
    const moving = dir.x !== 0 || dir.y !== 0;
    if (!moving) {
      this.play(`idle_${this.lastFacing}`, true);
      return;
    }
    if (Math.abs(dir.y) >= Math.abs(dir.x)) {
      if (dir.y < 0) {
        this.lastFacing = 'up';
        this.play('walk_up', true);
        this.setFlipX(false);
      } else if (dir.y > 0) {
        this.lastFacing = 'down';
        this.play('walk_down', true);
        this.setFlipX(false);
      }
    } else {
      this.lastFacing = 'side';
      this.setFlipX(dir.x < 0);
      this.play('walk_side', true);
    }
  }
}


