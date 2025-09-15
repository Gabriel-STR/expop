import Phaser from 'phaser';
import { ASSET_KEYS, EVENTS, INTERACTION_DISTANCE } from '../utils/constants.js';

export default class ItemPickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, itemId) {
    super(scene, x, y, ASSET_KEYS.ITEMS, itemId);
    this.itemId = itemId;
    this.setOrigin(0.5, 0.5);
  }

  initBody() {
    this.body.setCircle(10);
    this.body.setOffset(this.width / 2 - 10, this.height / 2 - 10);
    this.body.setImmovable(true);
    this.body.allowGravity = false;
  }

  static spawn(scene, x, y, itemId) {
    const pickup = new ItemPickup(scene, x, y, itemId);
    scene.add.existing(pickup);
    scene.physics.add.existing(pickup);
    pickup.initBody();
    pickup.setInteractive({ useHandCursor: true });

    const content = scene.cache.json.get('gameContent') || {};
    const itemDef = (content?.items?.catalog || []).find((i) => i.id === itemId);
    const description = itemDef?.description || `It is a ${itemId}.`;

    pickup.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
        if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
          pointer.event.stopPropagation();
        }
        scene.game.events.emit('ui:context:show', {
          x: pointer.x,
          y: pointer.y,
          options: [
            { label: 'Pick up', action: 'pickup', payload: { itemId, x: pickup.x, y: pickup.y } },
            { label: 'Examine', action: 'examine', payload: { itemId, description } }
          ]
        });
      } else if (pointer.leftButtonDown()) {
        if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
          pointer.event.stopPropagation();
        }
        // Require proximity
        const player = scene?.player;
        if (!player) return;
        const dist = Phaser.Math.Distance.Between(player.x, player.y, pickup.x, pickup.y);
        if (dist > INTERACTION_DISTANCE) {
          scene.game.events.emit(EVENTS.CHAT_MESSAGE, { text: 'Move closer to pick that up.' });
          return;
        }
        // Pick up on left click
        if (!scene || !scene.inventory) return;
        scene.inventory.add(itemId, 1);
        if (scene.audio && scene.audio.playSfx) scene.audio.playSfx(ASSET_KEYS.SFX_PICKUP);
        if (scene.game && scene.game.events) scene.game.events.emit(EVENTS.INVENTORY_CHANGED, scene.inventory.getAll());
        if (typeof scene._saveGame === 'function') scene._saveGame();
        pickup.destroy();
      }
    });
    if (scene.items) scene.items.add(pickup);
    return pickup;
  }
}


