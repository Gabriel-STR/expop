import { ASSET_KEYS, DEFAULT_SAVE_SLOT } from '../utils/constants.js';

export default class AudioManager {
  constructor(scene, dataStore) {
    this.scene = scene;
    this.dataStore = dataStore;
    this.music = null;
    this.footstep = null;
    const save = this.dataStore.read(DEFAULT_SAVE_SLOT);
    this.prefs = save?.settings || { muted: false, volume: 0.8 };
    this._applyPrefs();
  }

  _applyPrefs() {
    this.scene.sound.mute = !!this.prefs.muted;
    this.scene.sound.volume = Number.isFinite(this.prefs.volume) ? this.prefs.volume : 0.8;
  }

  setMuted(m) {
    this.prefs.muted = !!m;
    this._applyPrefs();
    this._persist();
  }

  setVolume(v) {
    this.prefs.volume = Math.max(0, Math.min(1, v));
    this._applyPrefs();
    this._persist();
  }

  getPrefs() {
    return { ...this.prefs };
  }

  playMusic(key, opts = {}) {
    const { loop = true, fade = 0 } = opts;
    if (this.music) {
      if (fade > 0) {
        const old = this.music;
        this.scene.tweens.add({ targets: old, volume: 0, duration: fade, onComplete: () => old.stop() });
      } else {
        this.music.stop();
      }
    }
    this.music = this.scene.sound.add(key, { loop, volume: this.prefs.volume });
    this.music.play();
    if (fade > 0) {
      this.music.setVolume(0);
      this.scene.tweens.add({ targets: this.music, volume: this.prefs.volume, duration: fade });
    }
  }

  stopMusic() {
    if (this.music) this.music.stop();
  }

  fadeOutMusic(duration = 200) {
    if (!this.music) return;
    const current = this.music;
    this.scene.tweens.add({ targets: current, volume: 0, duration, onComplete: () => current.stop() });
  }

  playSfx(key, config = {}) {
    this.scene.sound.play(key, { volume: this.prefs.volume * 1, ...config });
  }

  ensureFootstepsPlaying() {
    if (this.footstep && this.footstep.isPlaying) return;
    this.footstep = this.scene.sound.add(ASSET_KEYS.SFX_STEP, { loop: true, volume: this.prefs.volume * 0.3 });
    this.footstep.play();
  }

  stopFootsteps() {
    if (this.footstep && this.footstep.isPlaying) this.footstep.stop();
  }

  _persist() {
    const save = this.dataStore.read(DEFAULT_SAVE_SLOT) || { version: 1, player: { x: 64, y: 64, hp: 100 }, inventory: [] };
    save.settings = this.getPrefs();
    this.dataStore.write(DEFAULT_SAVE_SLOT, save);
  }
}


