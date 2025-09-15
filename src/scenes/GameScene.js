import Phaser from 'phaser';
import InputController from '../core/InputController.js';
import CameraController from '../core/CameraController.js';
import InventoryManager from '../core/InventoryManager.js';
import DataStore from '../core/DataStore.js';
import AudioManager from '../core/AudioManager.js';
import TaskSystem from '../core/TaskSystem.js';
import Player from '../objects/Player.js';
import ItemPickup from '../objects/ItemPickup.js';
import Interactable from '../objects/Interactable.js';
import { ASSET_KEYS, EVENTS, DEFAULT_SAVE_SLOT } from '../utils/constants.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.paused = false;
    this.levelCompleted = false;
  }

  init(data) {
    this.initialSave = data?.save || null;
  }

  create() {
    // Reset state flags in case of scene restarts
    this.levelCompleted = false;
    // Systems
    this.dataStore = new DataStore();
    this.inventory = new InventoryManager(this.dataStore);
    this.audio = new AudioManager(this, this.dataStore);
    this.tasks = new TaskSystem(this);
    this.inputController = new InputController(this);

    // Content-driven configuration
    const content = this.cache.json.get('gameContent') || {};

    // Map
    const map = this.make.tilemap({ key: ASSET_KEYS.TILEMAP });
    const tilesetName = content?.map?.tilesetName || 'demo_tileset';
    const tileW = content?.map?.tileWidth || 32;
    const tileH = content?.map?.tileHeight || 32;
    const tileset = map.addTilesetImage(tilesetName, ASSET_KEYS.TILESET, tileW, tileH, 0, 0);
    const requestedLayerName = (content?.map?.layers && content.map.layers[0]?.name) || 'World';
    const availableLayerNames = (map.layers || []).map(l => l.name);
    const resolvedLayerName = availableLayerNames.includes(requestedLayerName)
      ? requestedLayerName
      : (availableLayerNames[0] || 0);
    let layer = map.createLayer(resolvedLayerName, tileset, 0, 0);
    if (!layer) {
      console.warn('[GameScene] Failed to create layer with name:', resolvedLayerName, 'Available:', availableLayerNames);
    }
    const collidesProp = (content?.map?.layers && content.map.layers[0]?.collidesByProperty) || { collides: true };
    if (layer) {
      layer.setCollisionByProperty(collidesProp);
    }
    const blockedIndices = Array.isArray(content?.map?.blockedTileIndices) ? content.map.blockedTileIndices : [];
    if (blockedIndices.length) {
      layer.setCollision(blockedIndices);
    }
    if (layer) {
      this.physics.world.setBounds(0, 0, layer.width, layer.height);
    }
    this.map = map;
    this.worldLayer = layer;
    this.tileSize = map.tileWidth || 32;

    // Player — start at map center when no save position exists
    const defaultX = layer ? Math.floor(layer.width / 2) : 64;
    const defaultY = layer ? Math.floor(layer.height / 2) : 64;
    const startX = (this.initialSave && this.initialSave.player && typeof this.initialSave.player.x === 'number')
      ? this.initialSave.player.x : defaultX;
    const startY = (this.initialSave && this.initialSave.player && typeof this.initialSave.player.y === 'number')
      ? this.initialSave.player.y : defaultY;
    this.player = new Player(this, startX, startY);
    this.add.existing(this.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.initBody();
    if (layer) {
      this.physics.add.collider(this.player, layer);
    }

    // Items
    this.items = this.physics.add.group({ classType: ItemPickup, immovable: true, allowGravity: false });
    const spawns = content?.items?.spawns || [];
    for (const s of spawns) {
      ItemPickup.spawn(this, s.x, s.y, s.id);
    }

    // Remove collision-based item pickup; items are picked up via mouse click (see ItemPickup)

    // Interactables (generic)
    this.interactables = [];
    const interactDefs = content?.interactables || [];
    for (const def of interactDefs) {
      const conf = { ...def };
      const wasActivated = !!this.initialSave?.world?.interactables?.[conf.id]?.activated;
      const inter = new Interactable(this, conf.x, conf.y, conf);
      this.add.existing(inter);
      if (inter.solid) this.physics.add.collider(this.player, inter);
      inter.setActivated(wasActivated);
      this.interactables.push(inter);
    }

    // Tasks from content
    const taskDefs = content?.tasks || [];
    for (const t of taskDefs) {
      const completed = !!this.initialSave?.tasks?.[t.id]?.completed || false;
      this.tasks.upsertTask({ id: t.id, title: t.title, description: t.description, completed });
    }

    // Camera
    this.cameraController = new CameraController(this, this.player, { zoom: 2, rotationDeg: 0, lerpX: 0.1, lerpY: 0.1, deadzone: { w: 160, h: 120 } });

    // UI
    this.scene.launch('UIScene', { inventory: this.inventory, audio: this.audio, dataStore: this.dataStore, tasks: this.tasks });

    // Disable auto-playing game music at start

    // Mouse setup (click-to-move + right-click menus)
    this.input.mouse.disableContextMenu();
    this.moveTarget = null;
    this.moveMarker = this.add.graphics().setDepth(3).setVisible(false);
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        const snapped = this._snapToTileCenter(pointer.worldX, pointer.worldY);

          this.moveTarget = new Phaser.Math.Vector2(snapped.x, snapped.y);
          this._showMoveMarker(snapped.x, snapped.y);
          if (this.cameraController && this.cameraController.resumeFollow) {
            this.cameraController.resumeFollow();
          }

      }
    });

    // Restore inventory from save
    if (this.initialSave?.inventory?.length) {
      for (const it of this.initialSave.inventory) {
        this.inventory.add(it.id, it.qty);
      }
      this.game.events.emit(EVENTS.INVENTORY_CHANGED, this.inventory.getAll());
    }

    // Save on shutdown
    this.events.on('shutdown', () => {
      this._saveGame();
      if (this._onLevelCompleted) {
        this.game.events.off(EVENTS.LEVEL_COMPLETED, this._onLevelCompleted);
      }
    });
    this.events.on('destroy', () => {
      this._saveGame();
      if (this._onLevelCompleted) {
        this.game.events.off(EVENTS.LEVEL_COMPLETED, this._onLevelCompleted);
      }
    });

    // Listen for level completion to enable restart
    this._onLevelCompleted = () => {
      this.levelCompleted = true;
      this.paused = true;
      this.physics.world.isPaused = true;
      this.audio.stopFootsteps();
    };
    this.game.events.on(EVENTS.LEVEL_COMPLETED, this._onLevelCompleted);
  }

  _togglePause() {
    this.paused = !this.paused;
    this.physics.world.isPaused = this.paused;
    this.game.events.emit(this.paused ? 'ui:pause:show' : 'ui:pause:hide');
  }

  _saveGame() {
    const save = this.dataStore.read(DEFAULT_SAVE_SLOT) || {};
    const data = {
      version: 1,
      settings: save.settings || this.audio.getPrefs(),
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y), hp: 100 },
      inventory: this.inventory.getAll(),
      world: {
        interactables: this._serializeInteractablesState()
      },
      tasks: this._serializeTaskState()
    };
    this.dataStore.write(DEFAULT_SAVE_SLOT, data);
  }

  update() {
    // Restart game on Enter when level is completed
    if (this.levelCompleted && this.inputController.isEnterJustPressed()) {
      this.dataStore.clear(DEFAULT_SAVE_SLOT);
      this.scene.stop('UIScene');
      this.scene.restart({ save: null });
      return;
    }

    if (this.inputController.isPauseJustPressed()) {
      this._togglePause();
    }
    if (this.paused && this.inputController.isQuitJustPressed()) {
      this._saveGame();
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
      return;
    }
    if (this.inputController.isMuteJustPressed()) {
      this.audio.setMuted(!this.audio.getPrefs().muted);
    }
    if (this.inputController.isInventoryJustPressed()) {
      const ui = this.scene.get('UIScene');
      if (ui) ui.events.emit('ui:toggleInventory');
    }

    if (this.paused) return;

    // Camera
    this.cameraController.update();

    // Player movement
    let dir = { x: 0, y: 0 };
    const sprint = this.inputController.isSprinting();
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x;
      const dy = this.moveTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        this.moveTarget = null;
        this._hideMoveMarker();
      } else {
        dir = { x: dx / dist, y: dy / dist };
      }
    }
    this.player.updateMovement(dir, sprint);

    // Interactable activation is now click-based (handled in Interactable). No auto-activation here.

    // Auto-complete tasks based on inventory and world state
    // Example for content: mark FETCH_ORES when both ores are in inventory
    const hasCopper = this.inventory.has('COPPER_ORE', 1);
    const hasTin = this.inventory.has('TIN_ORE', 1);
    if (hasCopper && hasTin && !this.tasks.isCompleted('FETCH_ORES')) {
      this.tasks.markCompleted('FETCH_ORES');
    }

    // Step SFX
    const moving = dir.x !== 0 || dir.y !== 0;
    if (moving) {
      this.audio.ensureFootstepsPlaying();
    } else {
      this.audio.stopFootsteps();
    }
  }

  _snapToTileCenter(worldX, worldY) {
    const size = this.tileSize || 32;
    const tileX = Math.floor(worldX / size);
    const tileY = Math.floor(worldY / size);
    return { x: tileX * size + size / 2, y: tileY * size + size / 2 };
  }


  _showMoveMarker(x, y) {
    const g = this.moveMarker;
    if (!g) return;
    g.clear();
    g.lineStyle(2, 0x22c55e, 1);
    g.strokeCircle(0, 0, 8);
    g.beginPath();
    g.moveTo(-10, 0); g.lineTo(-4, 0);
    g.moveTo(4, 0); g.lineTo(10, 0);
    g.moveTo(0, -10); g.lineTo(0, -4);
    g.moveTo(0, 4); g.lineTo(0, 10);
    g.strokePath();
    g.setPosition(x, y);
    g.setVisible(true);
  }

  _hideMoveMarker() {
    const g = this.moveMarker;
    if (!g) return;
    g.clear();
    g.setVisible(false);
  }

  _serializeInteractablesState() {
    const state = {};
    if (Array.isArray(this.interactables)) {
      for (const inter of this.interactables) {
        const id = inter.id || `interactable_${Math.round(inter.x)}_${Math.round(inter.y)}`;
        state[id] = { activated: !!inter.isActivated };
      }
    }
    return state;
  }

  _serializeTaskState() {
    const map = {};
    if (this.tasks && this.tasks.listTasks) {
      for (const t of this.tasks.listTasks()) {
        map[t.id] = { completed: !!t.completed };
      }
    }
    return map;
  }
}


