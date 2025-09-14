import Phaser from 'phaser';
import { ASSET_KEYS, EVENTS } from '../utils/constants.js';

export default class Door extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width = 32, height = 20, options = {}) {
    super(scene, x, y, width, height, 0x6b4f2a, 1);
    this.isOpen = false;
    this.id = options.id || `door_${Math.round(x)}_${Math.round(y)}`;
    this.requiresItemId = options.requiresItemId || 'KEY';
    this.taskOnOpenId = options.taskOnOpenId || null;
    this.setOrigin(0.5, 0.5);
    // simple border
    this.setStrokeStyle(2, 0x3a2a18, 1);
  }

  enablePhysics() {
    this.scene.physics.add.existing(this, true); // static body
    // make collision box slightly larger/taller if desired
    if (this.body) {
      this.body.setSize(this.width, this.height);
    }
  }

  tryOpen(inventory, player, audio, tasks) {
    if (this.isOpen) return;
    const itemId = this.requiresItemId || 'KEY';
    if (!inventory?.has(itemId, 1)) return;
    // Require proximity contact
    const near = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 24;
    if (!near) return;
    this.isOpen = true;
    // consume key, update UI
    inventory.remove(itemId, 1);
    this.scene.game.events.emit(EVENTS.INVENTORY_CHANGED, inventory.getAll());
    // disable collision and play sfx
    if (this.body) this.body.enable = false;
    if (audio) audio.playSfx(ASSET_KEYS.SFX_PICKUP);
    // visual open: fade out and destroy
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 150,
      onComplete: () => this.destroy()
    });
    // notify tasks
    if (tasks) {
      if (this.taskOnOpenId) tasks.markCompleted(this.taskOnOpenId);
      tasks.markLevelCompleted({ reason: 'door_opened', doorId: this.id });
    }
  }
}


