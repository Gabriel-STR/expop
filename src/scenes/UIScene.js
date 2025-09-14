import Phaser from 'phaser';
import { EVENTS } from '../utils/constants.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.inventoryVisible = true;
  }

  init(data) {
    this.inventory = data.inventory;
    this.audio = data.audio;
    this.dataStore = data.dataStore;
    this.tasks = data.tasks;
  }

  create() {
    // Separate UI camera (by virtue of separate scene) so unaffected by world camera rotation
    const { width, height } = this.scale;

    // HUD text placeholders
    // this.hudText = this.add.text(8, 6, 'HP 100  |  Gold 0', {
    //   fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff'
    // }).setScrollFactor(0).setDepth(10);

    // Inventory grid
    this.inventoryCols = 8;
    this.inventoryRows = 1;
    this.inventorySlotSize = 44;
    this.inventoryPad = 6;
    this.inventoryInset = 8;
    this.inventoryContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);
    this._buildInventoryGrid();
    this._positionInventoryContainerBottom();
    this._renderInventory(this.inventory.getAll());

    // Objectives HUD
    this.objectiveContainer = this.add.container(20, 20).setScrollFactor(0).setDepth(10);
    this._buildObjectiveHud();
    this._renderObjectives(this.tasks?.listTasks?.() ? this.tasks.listTasks() : []);

    // Pause overlay UI (fixed, centered, full-screen dim)
    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1000).setVisible(false);
    this.pauseBg = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0, 0);
    this.pauseTitle = this.add.text(width / 2, height / 2 - 20, 'Paused', { fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    this.pauseHint = this.add.text(width / 2, height / 2 + 20, 'Esc: Resume  |  Q: Save & Quit  |  M: Mute', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e5e7eb' }).setOrigin(0.5);
    this.pauseContainer.add([this.pauseBg, this.pauseTitle, this.pauseHint]);

    // Level complete overlay
    this.completeContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1001).setVisible(false);
    this.completeBg = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0, 0);
    this.completeTitle = this.add.text(width / 2, height / 2 - 10, 'Level Complete!', { fontFamily: 'sans-serif', fontSize: '28px', color: '#22c55e' }).setOrigin(0.5);
    this.completeHint = this.add.text(width / 2, height / 2 + 24, 'Enter: Restart  |  Q: Save & Quit', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e5e7eb' }).setOrigin(0.5);
    this.completeContainer.add([this.completeBg, this.completeTitle, this.completeHint]);

    // Listen for inventory updates
    this.game.events.on(EVENTS.INVENTORY_CHANGED, (list) => this._renderInventory(list));
    // Listen for task updates
    this.game.events.on(EVENTS.TASKS_UPDATED, (list) => this._renderObjectives(list));

    // Toggle inventory from GameScene
    this.events.on('ui:toggleInventory', () => {
      this.inventoryVisible = !this.inventoryVisible;
      this.inventoryContainer.setVisible(this.inventoryVisible);
    });

    // Pause overlay show/hide from GameScene
    this.game.events.on('ui:pause:show', () => this.pauseContainer.setVisible(true));
    this.game.events.on('ui:pause:hide', () => this.pauseContainer.setVisible(false));

    // Level complete show
    this.game.events.on('level:completed', () => {
      this.completeContainer.setVisible(true);
    });

    // Handle window resize to keep UI centered and full-screen
    this.scale.on('resize', (gameSize) => this._onResize(gameSize));

    // Context menu
    this._buildContextMenu();
    this.game.events.on(EVENTS.UI_CONTEXT_SHOW, (cfg) => this._showContextMenu(cfg));
    this.game.events.on(EVENTS.UI_CONTEXT_HIDE, () => this._hideContextMenu());
    // Hide when clicking outside the menu
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      const clickedInside = currentlyOver && currentlyOver.includes(this.contextMenu);
      if (!clickedInside) {
        this._hideContextMenu();
      }
    });
  }

  _buildInventoryGrid() {
    const cols = this.inventoryCols;
    const rows = this.inventoryRows;
    const slotSize = this.inventorySlotSize;
    const pad = this.inventoryPad;
    const inset = this.inventoryInset;
    this.slots = [];

    // Panel background sized to content
    const panelWidth = cols * slotSize + (cols - 1) * pad + inset * 2;
    const panelHeight = rows * slotSize + (rows - 1) * pad + inset * 2;
    this.inventoryPanelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x0b1220, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x1e293b);
    this.inventoryContainer.add(this.inventoryPanelBg);

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = inset + c * (slotSize + pad);
        const y = inset + r * (slotSize + pad);
        const bg = this.add.rectangle(x, y, slotSize, slotSize, 0x0b1220, 0.85).setOrigin(0, 0).setStrokeStyle(1, 0x1e293b);
        const icon = this.add.image(x + slotSize / 2, y + slotSize / 2 - 2, '__MISSING__').setVisible(false);
        const label = this.add.text(x + slotSize - 4, y + slotSize - 2, '', { fontFamily: 'sans-serif', fontSize: '12px', color: '#e2e8f0' }).setOrigin(1, 1);
        this.inventoryContainer.add([bg, icon, label]);
        const hit = this.add.rectangle(x, y, slotSize, slotSize, 0x000000, 0.0001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', (pointer) => {
          const index = r * cols + c;
          const items = this.inventory.getAll().slice().sort((a, b) => a.id.localeCompare(b.id));
          const it = items[index];
          if (!it) return;
          if (pointer.rightButtonDown()) {
            if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
              pointer.event.stopPropagation();
            }
            const content = this.cache.json.get('gameContent') || {};
            const itemDef = (content?.items?.catalog || []).find((i) => i.id === it.id);
            const description = itemDef?.description || `It is a ${it.id}.`;
            this.game.events.emit('ui:context:show', {
              x: pointer.x,
              y: pointer.y,
              options: [ { label: 'Examine', action: 'examine', payload: { itemId: it.id, description } } ]
            });
          }
        });
        hit.on('pointerover', () => {
          const index = r * cols + c;
          const items = this.inventory.getAll().slice().sort((a, b) => a.id.localeCompare(b.id));
          const it = items[index];
          if (!it) return;
          const content = this.cache.json.get('gameContent') || {};
          const itemDef = (content?.items?.catalog || []).find((i) => i.id === it.id);
          const displayName = itemDef?.name || it.id;
          const p = this.input.activePointer;
          this._showHoverTooltip(`${displayName} x${it.qty}`, p.x + 12, p.y + 12);
        });
        hit.on('pointermove', () => {
          const p = this.input.activePointer;
          if (this.hoverTooltip) this.hoverTooltip.setPosition(p.x + 12, p.y + 12);
        });
        hit.on('pointerout', () => {
          this._hideHoverTooltip();
        });
        this.inventoryContainer.add(hit);
        this.slots.push({ bg, icon, label, hit });
      }
    }
  }

  _renderInventory(list) {
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i];
      const it = sorted[i];
      if (!it) {
        slot.icon.setVisible(false);
        slot.label.setText('');
        continue;
      }
      slot.icon.setTexture('items', it.id).setVisible(true);
      slot.label.setText(`x${it.qty}`);
    }
  }

  _onResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    this._positionInventoryContainerBottom();
    if (this.pauseBg) this.pauseBg.setSize(width, height);
    if (this.pauseTitle) this.pauseTitle.setPosition(width / 2, height / 2 - 20);
    if (this.pauseHint) this.pauseHint.setPosition(width / 2, height / 2 + 20);
    if (this.completeBg) this.completeBg.setSize(width, height);
    if (this.completeTitle) this.completeTitle.setPosition(width / 2, height / 2 - 10);
    if (this.completeHint) this.completeHint.setPosition(width / 2, height / 2 + 24);
  }

  _positionInventoryContainerBottom() {
    const { width, height } = this.scale;
    const cols = this.inventoryCols;
    const rows = this.inventoryRows;
    const slotSize = this.inventorySlotSize;
    const pad = this.inventoryPad;
    const inset = this.inventoryInset;
    const panelWidth = cols * slotSize + (cols - 1) * pad + inset * 2;
    const panelHeight = rows * slotSize + (rows - 1) * pad + inset * 2;
    const x = Math.floor(width / 2 - panelWidth / 2);
    const y = Math.floor(height - panelHeight - 16);
    this.inventoryContainer.setPosition(x, y);
  }

  _buildObjectiveHud() {
    const width = 300;
    const bg = this.add.rectangle(0, 0, width, 100, 0x111827, 0.6).setOrigin(0, 0).setStrokeStyle(1, 0x374151);
    const title = this.add.text(10, 8, 'Objectives', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e5e7eb' });
    const line = this.add.rectangle(10, 26, width - 20, 1, 0x374151, 1).setOrigin(0, 0);
    this.objectiveList = [];
    this.objectiveBg = bg;
    this.objectiveContainer.add([bg, title, line]);
  }

  _renderObjectives(list) {
    const tasks = Array.isArray(list) ? list : [];
    // Clear previous entries
    if (Array.isArray(this.objectiveList)) {
      for (const entry of this.objectiveList) entry.destroy();
    }
    this.objectiveList = [];
    if (!tasks.length) {
      this.objectiveContainer.setVisible(false);
      return;
    }
    const width = 300;
    const startY = 34;
    let y = startY;
    const lineHeight = 18;
    for (const t of tasks) {
      const label = t.completed ? `✔ ${t.title}` : `• ${t.title}`;
      const desc = t.description ? ` — ${t.description}` : '';
      const txt = this.add.text(10, y, label + desc, { fontFamily: 'sans-serif', fontSize: '14px', color: t.completed ? '#a7f3d0' : '#ffffff', wordWrap: { width: width - 20 } }).setOrigin(0, 0);
      this.objectiveContainer.add(txt);
      this.objectiveList.push(txt);
      y += Math.max(lineHeight, txt.height + 2);
    }
    const totalHeight = y + 8;
    this.objectiveBg.setSize(width, totalHeight);
    this.objectiveContainer.setVisible(true);
  }

  _buildContextMenu() {
    this.contextMenu = this.add.container(0, 0).setDepth(999).setScrollFactor(0).setVisible(false);
    const bg = this.add.rectangle(0, 0, 200, 30, 0x111827, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x374151);
    const label = this.add.text(8, 6, 'Examine', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e5e7eb' }).setOrigin(0, 0);
    this.contextMenu.add([bg, label]);
    this.contextMenu.setSize(200, 30);
    const hit = new Phaser.Geom.Rectangle(0, 0, 200, 30);
    this.contextMenu.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    this.contextMenu.on('pointerdown', (pointer) => {
      if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
        pointer.event.stopPropagation();
      }
      if (this.contextMenuPayload) {
        const { action, payload } = this.contextMenuPayload;
        if (action === 'examine') {
          const text = payload?.description || `It is a ${payload?.itemId || 'thing'}.`;
          this._showTooltip(text, this.contextMenu.x, this.contextMenu.y);
        }
      }
      this._hideContextMenu();
    });
  }

  _showContextMenu(cfg) {
    const { x, y, options } = cfg;
    const opt = options && options[0] ? options[0] : { label: 'Examine', action: 'examine', payload: null };
    const label = this.contextMenu.list?.find((c) => c.type === 'Text') || this.contextMenu.getAt(1);
    if (label?.setText) label.setText(opt.label || 'Examine');
    this.contextMenuPayload = opt;
    this.contextMenu.setPosition(x, y);
    this.contextMenu.setVisible(true);
  }

  _hideContextMenu() {
    this.contextMenu.setVisible(false);
    this.contextMenuPayload = null;
  }

  _showTooltip(text, x, y) {
    if (this.tooltip) {
      this.tooltip.destroy();
    }
    const padding = 6;
    const label = this.add.text(0, 0, text, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' });
    const bg = this.add.rectangle(0, 0, label.width + padding * 2, label.height + padding * 2, 0x111827, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x374151);
    const container = this.add.container(x, y, [bg, label]).setScrollFactor(0).setDepth(1000);
    label.setPosition(padding, padding);
    this.tooltip = container;
    this.time.delayedCall(1800, () => {
      if (this.tooltip) {
        this.tooltip.destroy();
        this.tooltip = null;
      }
    });
  }

  _showHoverTooltip(text, x, y) {
    this._hideHoverTooltip();
    const padding = 6;
    const label = this.add.text(0, 0, text, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' });
    const bg = this.add.rectangle(0, 0, label.width + padding * 2, label.height + padding * 2, 0x111827, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x374151);
    const container = this.add.container(x, y, [bg, label]).setScrollFactor(0).setDepth(1000);
    label.setPosition(padding, padding);
    this.hoverTooltip = container;
  }

  _hideHoverTooltip() {
    if (this.hoverTooltip) {
      this.hoverTooltip.destroy();
      this.hoverTooltip = null;
    }
  }
}


