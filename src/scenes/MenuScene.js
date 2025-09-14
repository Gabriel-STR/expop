import Phaser from 'phaser';
import DataStore from '../core/DataStore.js';
import AudioManager from '../core/AudioManager.js';
import { ASSET_KEYS } from '../utils/constants.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.dataStore = new DataStore();
    this.audio = new AudioManager(this, this.dataStore);

    const content = this.cache.json.get('gameContent') || {};
    const wantsMusic = (content?.audio?.music?.type || 'loop') !== 'none';
    const hasMusicInCache = this.cache.audio && this.cache.audio.exists && this.cache.audio.exists(ASSET_KEYS.MUSIC_THEME);
    if (wantsMusic && hasMusicInCache) {
      this.audio.playMusic(ASSET_KEYS.MUSIC_THEME, { loop: true, fade: 300 });
    }

    const { width, height } = this.scale;
    const title = this.add.text(width / 2, height * 0.25, 'BrainPOP Expedition', {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, title.y + 40, 'Building the future of learning', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#9ca3af'
    }).setOrigin(0.5);

    const startBtn = this._makeButton(width / 2, height * 0.5, 'New Game', () => this._startNew());

    this.add.text(width / 2, height * 0.5 + 110, 'Enter: Start   M: Mute/Unmute', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#cbd5e1'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => this._startNew());
    this.input.keyboard.on('keydown-M', () => this.audio.setMuted(!this.audio.getPrefs().muted));
  }

  _makeButton(x, y, label, onClick) {
    const txt = this.add.text(x, y, label, {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#e5e7eb', backgroundColor: '#111827', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt.on('pointerdown', onClick);
    txt.on('pointerover', () => txt.setStyle({ backgroundColor: '#1f2937' }));
    txt.on('pointerout', () => txt.setStyle({ backgroundColor: '#111827' }));
    return txt;
  }

  _startNew() {
    this.dataStore.clear();
    this.audio.fadeOutMusic(250);
    this.time.delayedCall(260, () => {
      this.scene.stop('MenuScene');
      this.scene.start('GameScene', { save: null });
    });
  }


}


