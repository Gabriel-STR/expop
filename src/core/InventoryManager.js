import { DEFAULT_SAVE_SLOT } from '../utils/constants.js';

export default class InventoryManager {
  constructor(dataStore) {
    this.dataStore = dataStore;
    const save = this.dataStore.read(DEFAULT_SAVE_SLOT);
    this.items = new Map();
    if (save && Array.isArray(save.inventory)) {
      for (const it of save.inventory) this.items.set(it.id, it.qty);
    }
  }

  add(itemId, qty = 1) {
    const current = this.items.get(itemId) || 0;
    this.items.set(itemId, current + qty);
    this._persist();
  }

  remove(itemId, qty = 1) {
    const current = this.items.get(itemId) || 0;
    const next = Math.max(0, current - qty);
    if (next === 0) this.items.delete(itemId); else this.items.set(itemId, next);
    this._persist();
  }

  has(itemId, qty = 1) {
    return (this.items.get(itemId) || 0) >= qty;
  }

  getAll() {
    return Array.from(this.items.entries()).map(([id, qty]) => ({ id, qty }));
  }

  clear() {
    this.items.clear();
    this._persist();
  }

  _persist() {
    const save = this.dataStore.read(DEFAULT_SAVE_SLOT) || { version: 1, settings: { muted: false, volume: 0.8 }, player: { x: 64, y: 64, hp: 100 } };
    save.inventory = this.getAll();
    this.dataStore.write(DEFAULT_SAVE_SLOT, save);
  }
}


