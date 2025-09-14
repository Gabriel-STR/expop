import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/constants.js';
import { generateBeepWavDataUrl, generateMusicLoopWavDataUrl, drawCanvasShape, drawCanvasPath } from '../utils/helpers.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;
    const barWidth = Math.floor(width * 0.6);
    const barBg = this.add.rectangle(width / 2, height / 2, barWidth, 16, 0x222222);
    const bar = this.add.rectangle(width / 2 - barWidth / 2, height / 2, 2, 12, 0x00e5ff).setOrigin(0, 0.5);
    this.load.on('progress', (p) => { bar.width = Math.max(2, Math.floor(barWidth * p)); });

    const contentUrl = new URL('../content/gameContent.json', import.meta.url);
    this.load.json('gameContent', contentUrl.href);
  }

  create() {
    const content = this.cache.json.get('gameContent') || {};

    // Audio from content
    const sfx = content?.audio?.sfx || {};
    const music = content?.audio?.music || {};
    const pickupUrl = sfx.pickup?.type === 'beep' ? generateBeepWavDataUrl(sfx.pickup.frequency || 880, sfx.pickup.durationMs || 120, sfx.pickup.volume || 0.5) : generateBeepWavDataUrl(880, 120, 0.5);
    const stepUrl = sfx.step?.type === 'beep' ? generateBeepWavDataUrl(sfx.step.frequency || 220, sfx.step.durationMs || 80, sfx.step.volume || 0.25) : generateBeepWavDataUrl(220, 80, 0.25);
    const musicUrl = music.type === 'none' ? null : generateMusicLoopWavDataUrl();
    this.load.audio(ASSET_KEYS.SFX_PICKUP, [pickupUrl]);
    this.load.audio(ASSET_KEYS.SFX_STEP, [stepUrl]);
    if (musicUrl) this.load.audio(ASSET_KEYS.MUSIC_THEME, [musicUrl]);

    // Tileset from content
    this._createTilesetFromContent(content);
    // Player sprite from content
    this._createPlayerFromContent(content);
    // Items atlas from content
    this._createItemsFromContent(content);

    // Tilemap
    if (content && content.map) {
      if (content.map.tilemapData) {
        this.cache.tilemap.add(ASSET_KEYS.TILEMAP, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: content.map.tilemapData });
      } else if (content.map.tilemapUrl) {
        const mapUrl = new URL(content.map.tilemapUrl, import.meta.url);
        this.load.tilemapTiledJSON(ASSET_KEYS.TILEMAP, mapUrl.href);
      }
    }

    this.load.once('complete', () => {
      this.scene.start('MenuScene');
    });
    this.load.start();
  }

  _createTilesetFromContent(content) {
    const tileSize = content?.tileset?.tileSize || content?.map?.tileWidth || 32;
    const tiles = content?.tileset?.tiles || [ { id: 0, color: '#2a2a2a' }, { id: 1, color: '#6b4f2a' } ];
    const width = tileSize * Math.max(tiles.length, 1);
    const canvas = this.textures.createCanvas(ASSET_KEYS.TILESET, width, tileSize);
    const ctx = canvas.getContext();

    const drawLayer = (layerDef, cx, cy, sizeW, sizeH) => {
      if (!layerDef) return;
      const lw = Math.max(1, Math.floor((layerDef.lineWidth ?? 1)));
      if (layerDef.path) {
        drawCanvasPath(ctx, layerDef.path, cx, cy, sizeW * (layerDef.scaleX ?? 1), sizeH * (layerDef.scaleY ?? 1), {
          fillStyle: layerDef.color || '#666666',
          strokeStyle: layerDef.strokeColor || '#111111',
          lineWidth: lw
        });
      } else {
        const shape = layerDef.shape || 'rect';
        drawCanvasShape(ctx, shape, cx, cy, sizeW * (layerDef.scaleX ?? 1), sizeH * (layerDef.scaleY ?? 1), {
          fillStyle: layerDef.color || '#666666',
          strokeStyle: layerDef.strokeColor || '#111111',
          lineWidth: lw,
          cornerRadius: layerDef.cornerRadius ?? Math.floor(tileSize * 0.2)
        });
      }
    };

    tiles.forEach((t, i) => {
      const cx = i * tileSize + tileSize / 2;
      const cy = tileSize / 2;
      const sizeW = tileSize - 1;
      const sizeH = tileSize - 1;

      if (Array.isArray(t.layers) && t.layers.length > 0) {
        for (const layer of t.layers) {
          drawLayer(layer, cx, cy, sizeW, sizeH);
        }
      } else if (t.path) {
        drawCanvasPath(ctx, t.path, cx, cy, sizeW, sizeH, {
          fillStyle: t.color || '#666666',
          strokeStyle: '#111111',
          lineWidth: 1
        });
      } else {
        const shape = t.shape || 'rect';
        drawCanvasShape(ctx, shape, cx, cy, sizeW, sizeH, {
          fillStyle: t.color || '#666666',
          strokeStyle: '#111111',
          lineWidth: 1,
          cornerRadius: Math.floor(tileSize * 0.2)
        });
      }
      canvas.add(i, 0, i * tileSize, 0, tileSize, tileSize);
    });
    canvas.refresh();
  }

  _createPlayerFromContent(content) {
    const size = Math.max(16, content?.player?.height || 32);
    const width = Math.max(16, content?.player?.width || 32);
    const cols = 2;
    const rows = 3;
    const canvas = this.textures.createCanvas(ASSET_KEYS.PLAYER, width * cols, size * rows);
    const ctx = canvas.getContext();
    const bodyColor = content?.player?.color || '#60a5fa';

    const drawFrame = (fx, fy, stepOffset = 0) => {
      const x = fx * width;
      const y = fy * size;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x + Math.floor(width * 0.2), y + Math.floor(size * 0.15), Math.floor(width * 0.6), Math.floor(size * 0.7));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + Math.floor(width * 0.35), y + Math.floor(size * 0.05), Math.floor(width * 0.3), Math.floor(size * 0.15));
      ctx.fillStyle = '#111111';
      ctx.fillRect(x + Math.floor(width * 0.25), y + size - 8 - stepOffset, 6, 4);
      ctx.fillRect(x + width - Math.floor(width * 0.25) - 6, y + size - 8 + stepOffset, 6, 4);
    };

    drawFrame(0, 0, 1); drawFrame(1, 0, -1);
    drawFrame(0, 1, 1); drawFrame(1, 1, -1);
    drawFrame(0, 2, 1); drawFrame(1, 2, -1);

    canvas.add('down_0', 0, 0, 0, width, size);
    canvas.add('down_1', 0, width, 0, width, size);
    canvas.add('up_0', 0, 0, size, width, size);
    canvas.add('up_1', 0, width, size, width, size);
    canvas.add('side_0', 0, 0, size * 2, width, size);
    canvas.add('side_1', 0, width, size * 2, width, size);
    canvas.refresh();

    this.anims.create({ key: 'idle_down', frames: [{ key: ASSET_KEYS.PLAYER, frame: 'down_0' }], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'idle_up', frames: [{ key: ASSET_KEYS.PLAYER, frame: 'up_0' }], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'idle_side', frames: [{ key: ASSET_KEYS.PLAYER, frame: 'side_0' }], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'walk_down', frames: [{ key: ASSET_KEYS.PLAYER, frame: 'down_0' }, { key: ASSET_KEYS.PLAYER, frame: 'down_1' }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'walk_up', frames: [{ key: ASSET_KEYS.PLAYER, frame: 'up_0' }, { key: ASSET_KEYS.PLAYER, frame: 'up_1' }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'walk_side', frames: [{ key: ASSET_KEYS.PLAYER, frame: 'side_0' }, { key: ASSET_KEYS.PLAYER, frame: 'side_1' }], frameRate: 8, repeat: -1 });
  }

  _createItemsFromContent(content) {
    const size = 32;
    const catalog = content?.items?.catalog || [];
    const canvas = this.textures.createCanvas(ASSET_KEYS.ITEMS, size * Math.max(catalog.length, 1), size);
    const ctx = canvas.getContext();
    catalog.forEach((it, idx) => {
      const cx = idx * size + size / 2;
      const cy = size / 2;
      const w = Math.floor(size * 0.7);
      const h = Math.floor(size * 0.7);
      if (it.path) {
        drawCanvasPath(ctx, it.path, cx, cy, w, h, {
          fillStyle: it.color || '#cccccc',
          strokeStyle: '#111111',
          lineWidth: 1
        });
      } else {
        const shape = it.shape || 'rect';
        drawCanvasShape(ctx, shape, cx, cy, w, h, {
          fillStyle: it.color || '#cccccc',
          strokeStyle: '#111111',
          lineWidth: 1,
          cornerRadius: 6
        });
      }
      canvas.add(it.id, 0, idx * size, 0, size, size);
    });
    canvas.refresh();
  }
}


