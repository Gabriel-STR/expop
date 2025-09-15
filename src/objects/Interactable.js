import Phaser from 'phaser';
import { ASSET_KEYS, EVENTS, INTERACTION_DISTANCE } from '../utils/constants.js';
import { drawGraphicsShape, drawGraphicsPath } from '../utils/helpers.js';

export default class Interactable extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y);
    this.id = config.id || `interactable_${Math.round(x)}_${Math.round(y)}`;
    this.shape = config.shape || 'rect'; // 'rect' | 'circle'
    this.color = config.color || '#888888';
    this.width = config.width || 32;
    this.height = config.height || 32;
    this.solid = !!config.solid;
    this.description = config.description || 'An object.';
    this.interactMessage = config.interactMessage || null;
    this.path = config.path || null; // normalized path string if provided
    this.requiresItemId = config.requiresItemId || null;
    this.requiresAllItemIds = Array.isArray(config.requiresAllItemIds) ? config.requiresAllItemIds.slice() : null;
    this.grantItemId = config.grantItemId || null;
    this.grantQty = typeof config.grantQty === 'number' ? config.grantQty : 1;
    this.completesLevel = !!config.completesLevel;
    this.onActivateTaskId = config.onActivateTaskId || null;
    this.isActivated = false;

    // Visual
    this._buildVisual();

    // Interaction
    this.setSize(this.width, this.height);
    this.setInteractive(new Phaser.Geom.Rectangle(-this.width / 2, -this.height / 2, this.width, this.height), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
        if (pointer.event && typeof pointer.event.stopPropagation === 'function') pointer.event.stopPropagation();
        const options = [];
        // For furnace-like interactables, show Smelt if requirements met
        const canSmelt = Array.isArray(this.requiresAllItemIds) && this.requiresAllItemIds.length > 0;
        if (canSmelt) {
          options.push({ label: 'Smelt', action: 'smelt', payload: { id: this.id } });
        }
        options.push({ label: 'Examine', action: 'examine', payload: { id: this.id, description: this.description } });
        this.scene.game.events.emit(EVENTS.UI_CONTEXT_SHOW, { x: pointer.x, y: pointer.y, options });
      } else if (pointer.leftButtonDown()) {
        if (pointer.event && typeof pointer.event.stopPropagation === 'function') pointer.event.stopPropagation();
        const near = this._isPlayerNear();
        if (!near) {
          const msg = this.interactMessage || 'You are too far away to interact.';
          this.scene.game.events.emit(EVENTS.CHAT_MESSAGE, { text: msg });
          return;
        }
        const changed = this.tryActivate(this.scene.inventory, this.scene.player, this.scene.audio, this.scene.tasks);
        if (!changed) {
          const msg = this.interactMessage || 'Nothing happens.';
          this.scene.game.events.emit(EVENTS.CHAT_MESSAGE, { text: msg });
        } else if (this.description) {
          // Optional feedback
          this.scene.game.events.emit(EVENTS.CHAT_MESSAGE, { text: 'You interact with it.' });
        }
        if (typeof this.scene._saveGame === 'function') this.scene._saveGame();
      }
    });

    // Physics
    if (this.solid) {
      this.scene.physics.add.existing(this, true);
      // Expand body to our size
      if (this.body && this.body.setSize) this.body.setSize(this.width, this.height);
    }
  }

  _buildVisual() {
    const g = this.scene.add.graphics();
    if (this.path) {
      drawGraphicsPath(g, this.path, this.width, this.height, {
        fillColor: this.color,
        strokeColor: 0x111111,
        lineWidth: 2,
        alpha: 1,
      });
    } else {
      drawGraphicsShape(g, this.shape, this.width, this.height, {
        fillColor: this.color,
        strokeColor: 0x111111,
        lineWidth: 2,
        cornerRadius: 8,
        alpha: 1,
      });
    }
    this.add(g);
    this.visual = g;
  }

  setActivated(active) {
    this.isActivated = !!active;
    if (this.isActivated) {
      if (this.body) this.body.enable = false;
      this.setAlpha(0.15);
    } else {
      if (this.body) this.body.enable = !!this.solid;
      this.setAlpha(1);
    }
  }

  tryActivate(inventory, player, audio, tasks) {
    if (this.isActivated) return false;
    const near = this._isPlayerNear();
    if (!near) return false;
    if (this.requiresItemId && !inventory?.has(this.requiresItemId, 1)) return false;
    if (this.requiresAllItemIds && this.requiresAllItemIds.length) {
      for (const rid of this.requiresAllItemIds) {
        if (!inventory?.has(rid, 1)) return false;
      }
    }

    let inventoryChanged = false;
    if (this.requiresItemId) {
      inventory.remove(this.requiresItemId, 1);
      inventoryChanged = true;
    }
    if (this.requiresAllItemIds && this.requiresAllItemIds.length) {
      for (const rid of this.requiresAllItemIds) {
        inventory.remove(rid, 1);
      }
      inventoryChanged = true;
    }
    if (this.grantItemId) {
      inventory.add(this.grantItemId, Math.max(1, this.grantQty || 1));
      inventoryChanged = true;
    }
    if (inventoryChanged) {
      this.scene.game.events.emit(EVENTS.INVENTORY_CHANGED, inventory.getAll());
    }

    this.setActivated(true);
    if (audio) audio.playSfx(ASSET_KEYS.SFX_PICKUP);
    if (tasks) {
      if (this.onActivateTaskId) tasks.markCompleted(this.onActivateTaskId);
      // Level completion is now decided by TaskSystem when all tasks are complete
    }
    return true;
  }

  _isPlayerNear() {
    const player = this.scene?.player;
    if (!player) return false;
    let near = false;
    const threshold = Math.max(INTERACTION_DISTANCE, Math.max(this.width, this.height) * 0.75);
    const playerBody = player?.body;
    if (this.solid && this.body && playerBody) {
      const dx = Math.abs(this.x - player.x);
      const dy = Math.abs(this.y - player.y);
      const rx = (this.width / 2) + (playerBody.width / 2) + 4;
      const ry = (this.height / 2) + (playerBody.height / 2) + 4;
      near = dx <= rx && dy <= ry;
    } else {
      near = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= threshold;
    }
    return near;
  }
}
