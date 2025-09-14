import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/constants.js';

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
            { label: 'Examine', action: 'examine', payload: { itemId, description } }
          ]
        });
      }
    });
    if (scene.items) scene.items.add(pickup);
    return pickup;
  }
}


