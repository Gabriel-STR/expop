export default class DataStore {
  constructor(namespace = 'phaserTopdown') {
    this.ns = namespace;
  }

  _key(slot = 'save1') {
    return `${this.ns}.${slot}`;
  }

  read(slot = 'save1') {
    try {
      const raw = localStorage.getItem(this._key(slot));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  write(slot = 'save1', data) {
    try {
      localStorage.setItem(this._key(slot), JSON.stringify(data));
    } catch (_) {
      // ignore
    }
  }

  clear(slot = 'save1') {
    try {
      localStorage.removeItem(this._key(slot));
    } catch (_) {
      // ignore
    }
  }
}


