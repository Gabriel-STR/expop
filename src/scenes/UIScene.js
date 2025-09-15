import Phaser from 'phaser';
import { EVENTS, ASSET_KEYS, INTERACTION_DISTANCE } from '../utils/constants.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.inventoryVisible = true;
    this.selectedInventoryIndex = -1;
    this.selectedInventoryItemId = null;
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
    // Chat UI
    this._buildChatUi();

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
    this.completeButtonBg = this.add.rectangle(width / 2, height / 2 + 24, 220, 36, 0x111827, 0.95).setOrigin(0.5).setStrokeStyle(1, 0x374151).setInteractive({ useHandCursor: true });
    this.completeButtonLabel = this.add.text(width / 2, height / 2 + 24, 'Mission Complete', { fontFamily: 'sans-serif', fontSize: '16px', color: '#e5e7eb' }).setOrigin(0.5);
    this.completeButtonBg.on('pointerover', () => this.completeButtonBg.setFillStyle(0x1f2937, 0.95));
    this.completeButtonBg.on('pointerout', () => this.completeButtonBg.setFillStyle(0x111827, 0.95));
    this.completeButtonBg.on('pointerdown', () => {
      const gs = this.scene.get('GameScene');
      try { if (gs && gs.dataStore) gs.dataStore.clear(); } catch (e) {}
      if (this.audio && this.audio.fadeOutMusic) this.audio.fadeOutMusic(250);
      this.time.delayedCall(260, () => {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      });
    });
    this.completeContainer.add([this.completeBg, this.completeTitle, this.completeButtonBg, this.completeButtonLabel]);

    // Listen for inventory updates
    this.game.events.on(EVENTS.INVENTORY_CHANGED, (list) => this._renderInventory(list));
    // Listen for task updates
    this.game.events.on(EVENTS.TASKS_UPDATED, (list) => this._renderObjectives(list));
    // Listen for chat messages
    this.game.events.on(EVENTS.CHAT_MESSAGE, (msg) => {
      const text = typeof msg === 'string' ? msg : (msg?.text || '');
      if (text) this._appendChat(text);
    });

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
      const over = Array.isArray(currentlyOver) ? currentlyOver : [];
      const isChild = (obj) => (this.contextMenu && this.contextMenu.list && this.contextMenu.list.includes(obj));
      const clickedInside = over.some((obj) => obj === this.contextMenu || isChild(obj));
      if (!clickedInside) this._hideContextMenu();
    });

    // Map controls (pan and center)
    this._buildMapControls();
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
          if (pointer.leftButtonDown()) {
            if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
              pointer.event.stopPropagation();
            }
            this._setSelectedInventory(index, it.id);
          } else if (pointer.rightButtonDown()) {
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

  _buildMapControls() {
    const { width, height } = this.scale;
    const size = 32;
    const pad = 6;
    const baseX = width - (size * 3 + pad * 2) - 16;
    const baseY = height - (size * 3 + pad * 2) - 16 - (this.inventoryPanelBg?.height || 0) - 12;

    const container = this.add.container(baseX, baseY).setScrollFactor(0).setDepth(15);
    const makeBtn = (x, y, label, onClick) => {
      const bg = this.add.rectangle(x, y, size, size, 0x111827, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x374151).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x + size / 2, y + size / 2, label, { fontFamily: 'sans-serif', fontSize: '16px', color: '#e5e7eb' }).setOrigin(0.5);
      bg.on('pointerover', () => bg.setFillStyle(0x1f2937, 0.95));
      bg.on('pointerout', () => bg.setFillStyle(0x111827, 0.9));
      bg.on('pointerdown', (p) => {
        if (p.event && typeof p.event.stopPropagation === 'function') p.event.stopPropagation();
        onClick();
      });
      container.add([bg, txt]);
      return bg;
    };

    const panAmount = 128; // pixels per click
    const gs = this.scene.get('GameScene');
    const panBy = (dx, dy) => {
      if (!gs || !gs.cameraController || !gs.cameraController.panBy) return;
      gs.cameraController.panBy(dx, dy);
    };
    const centerOnPlayer = () => {
      if (!gs || !gs.cameraController || !gs.cameraController.resumeFollow) return;
      gs.cameraController.resumeFollow();
    };

    // Layout: up
    makeBtn(size + pad, 0, '▲', () => panBy(0, -panAmount));
    // left, center, right
    makeBtn(0, size + pad, '◀', () => panBy(-panAmount, 0));
    makeBtn(size + pad, size + pad, '•', () => centerOnPlayer());
    makeBtn(size * 2 + pad * 2, size + pad, '▶', () => panBy(panAmount, 0));
    // down
    makeBtn(size + pad, size * 2 + pad * 2, '▼', () => panBy(0, panAmount));

    this.mapControls = container;
    // Keep positioned on resize
    this.scale.on('resize', (gameSize) => {
      const w = gameSize.width; const h = gameSize.height;
      const bx = w - (size * 3 + pad * 2) - 16;
      const by = h - (size * 3 + pad * 2) - 16 - (this.inventoryPanelBg?.height || 0) - 12;
      container.setPosition(bx, by);
    });
  }

  _renderInventory(list) {
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i];
      const it = sorted[i];
      if (!it) {
        slot.icon.setVisible(false);
        slot.label.setText('');
        slot.bg.setStrokeStyle(1, 0x1e293b);
        continue;
      }
      slot.icon.setTexture('items', it.id).setVisible(true);
      slot.label.setText(`x${it.qty}`);
      if (i === this.selectedInventoryIndex) slot.bg.setStrokeStyle(2, 0x22c55e); else slot.bg.setStrokeStyle(1, 0x1e293b);
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
    if (this.completeButtonBg) this.completeButtonBg.setPosition(width / 2, height / 2 + 24);
    if (this.completeButtonLabel) this.completeButtonLabel.setPosition(width / 2, height / 2 + 24);
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
    const bg = this.add.rectangle(0, 0, 200, 64, 0x111827, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x374151);
    const label1 = this.add.text(8, 6, 'Examine', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e5e7eb' }).setOrigin(0, 0);
    const label2 = this.add.text(8, 34, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e5e7eb' }).setOrigin(0, 0).setVisible(false);
    this.contextMenu.add([bg, label1, label2]);
    this.contextMenu.setSize(200, 64);
    const hit = new Phaser.Geom.Rectangle(0, 0, 200, 64);
    this.contextMenu.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    // Dedicated hit zones for reliable option clicks
    this.contextHit1 = this.add.rectangle(0, 0, 200, 30, 0x000000, 0.0001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.contextHit2 = this.add.rectangle(0, 32, 200, 30, 0x000000, 0.0001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.contextMenu.add([this.contextHit1, this.contextHit2]);
    this.contextHit1.on('pointerdown', (pointer) => {
      if (pointer.event && typeof pointer.event.stopPropagation === 'function') pointer.event.stopPropagation();
      this._executeContextAction(this.contextMenuPayload1, pointer);
    });
    this.contextHit2.on('pointerdown', (pointer) => {
      if (pointer.event && typeof pointer.event.stopPropagation === 'function') pointer.event.stopPropagation();
      this._executeContextAction(this.contextMenuPayload2, pointer);
    });
  }

  _showContextMenu(cfg) {
    const { x, y, options } = cfg;
    const label1 = this.contextMenu.getAt(1);
    const label2 = this.contextMenu.getAt(2);
    // Default single option
    let opt1 = { label: 'Examine', action: 'examine', payload: null };
    let opt2 = null;
    if (Array.isArray(options) && options.length > 0) {
      opt1 = options[0] || opt1;
      opt2 = options[1] || null;
    }
    if (label1?.setText) label1.setText(opt1.label || 'Examine');
    if (opt2 && label2?.setText) {
      label2.setText(opt2.label || '');
      label2.setVisible(true);
      if (this.contextHit2) this.contextHit2.setVisible(true);
    } else if (label2) {
      label2.setVisible(false);
      if (this.contextHit2) this.contextHit2.setVisible(false);
    }
    // Store both options; click handler chooses which
    this.contextMenuPayload1 = opt1;
    this.contextMenuPayload2 = opt2;
    this.contextMenu.setPosition(x, y);
    this.contextMenu.setVisible(true);
  }

  _hideContextMenu() {
    this.contextMenu.setVisible(false);
    this.contextMenuPayload1 = null;
    this.contextMenuPayload2 = null;
  }

  _executeContextAction(chosen, pointer) {
    if (!chosen) { this._hideContextMenu(); return; }
    const { action, payload } = chosen;
    if (action === 'examine') {
      const text = payload?.description || `It is a ${payload?.itemId || 'thing'}.`;
      this.game.events.emit(EVENTS.CHAT_MESSAGE, { text });
    } else if (action === 'pickup') {
      const gs = this.scene.get('GameScene');
      const itemId = payload?.itemId;
      if (gs && itemId) {
        // Enforce proximity before pickup via menu
        const pickX = payload?.x; const pickY = payload?.y;
        const player = gs.player;
        if (typeof pickX === 'number' && typeof pickY === 'number' && player) {
          const dist = Phaser.Math.Distance.Between(player.x, player.y, pickX, pickY);
          if (dist > INTERACTION_DISTANCE) {
            this.game.events.emit(EVENTS.CHAT_MESSAGE, { text: 'Move closer to pick that up.' });
            this._hideContextMenu();
            return;
          }
        }
        gs.inventory.add(itemId, 1);
        if (gs.audio && gs.audio.playSfx) gs.audio.playSfx(ASSET_KEYS.SFX_PICKUP);
        if (gs.game && gs.game.events) gs.game.events.emit(EVENTS.INVENTORY_CHANGED, gs.inventory.getAll());
        if (typeof gs._saveGame === 'function') gs._saveGame();
        // Remove the pickup sprite near the payload coordinates
        const px2 = payload?.x; const py2 = payload?.y;
        if (typeof px2 === 'number' && typeof py2 === 'number') {
          const candidates = gs.children.list || [];
          let closest = null; let bestDist = Infinity;
          for (const obj of candidates) {
            if (!obj || !obj.active) continue;
            if (typeof obj.itemId !== 'string') continue;
            if (obj.itemId !== itemId) continue;
            const dx = obj.x - px2; const dy = obj.y - py2;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) { bestDist = d2; closest = obj; }
          }
          if (closest && bestDist <= 32 * 32 && closest.destroy) closest.destroy();
        }
      }
    } else if (action === 'smelt') {
      const gs = this.scene.get('GameScene');
      const furnace = gs?.interactables?.find((i) => i?.id === (payload?.id));
      if (gs && furnace) {
        if (!furnace._isPlayerNear()) {
          this.game.events.emit(EVENTS.CHAT_MESSAGE, { text: 'Get closer to the furnace to smelt.' });
        } else {
          const changed = furnace.tryActivate(gs.inventory, gs.player, gs.audio, gs.tasks);
          if (!changed) {
            this.game.events.emit(EVENTS.CHAT_MESSAGE, { text: 'You lack the required materials.' });
          } else if (typeof gs._saveGame === 'function') {
            gs._saveGame();
          }
        }
      }
    }
    this._hideContextMenu();
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

  _setSelectedInventory(index, itemId) {
    this.selectedInventoryIndex = index;
    this.selectedInventoryItemId = itemId;
    this._renderInventory(this.inventory.getAll());
    this.game.events.emit(EVENTS.UI_INVENTORY_SELECTED, { itemId });
  }

  _buildChatUi() {
    const width = 360;
    const lineHeight = 16;
    const maxLines = 7;
    this.chatMaxLines = maxLines;
    this.chatLineHeight = lineHeight;
    this.chatMessages = [];
    const { width: sw, height: sh } = this.scale;
    const container = this.add.container(16, sh - (lineHeight * maxLines + 20)).setScrollFactor(0).setDepth(12);
    const bg = this.add.rectangle(0, 0, width, lineHeight * maxLines + 12, 0x0b1220, 0.6).setOrigin(0, 0).setStrokeStyle(1, 0x1e293b);
    container.add(bg);
    this.chatContainer = container;
    this.chatBg = bg;
    this.scale.on('resize', (gameSize) => {
      const h = gameSize.height;
      container.setPosition(16, h - (lineHeight * maxLines + 20));
      bg.setSize(width, lineHeight * maxLines + 12);
    });
  }

  _appendChat(text) {
    if (!this.chatContainer) return;
    const max = this.chatMaxLines || 7;
    const yStart = 6;
    const lh = this.chatLineHeight || 16;
    const txt = this.add.text(8, yStart, text, { fontFamily: 'sans-serif', fontSize: '13px', color: '#e5e7eb', wordWrap: { width: (this.chatBg?.width || 340) - 16 } }).setOrigin(0, 0);
    this.chatContainer.add(txt);
    this.chatMessages.push(txt);
    // Reflow
    let y = yStart;
    for (const t of this.chatMessages) {
      t.setPosition(8, y);
      y += Math.max(lh, t.height + 2);
    }
    // Trim
    while (this.chatMessages.length > max) {
      const old = this.chatMessages.shift();
      if (old) old.destroy();
      // Reflow again
      y = yStart;
      for (const t of this.chatMessages) {
        t.setPosition(8, y);
        y += Math.max(lh, t.height + 2);
      }
    }
  }
}


