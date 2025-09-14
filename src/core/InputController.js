import Phaser from 'phaser';

export default class InputController {
  constructor(scene) {
    this.scene = scene;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });
  }

  getDirection() {
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    let x = (right ? 1 : 0) + (left ? -1 : 0);
    let y = (down ? 1 : 0) + (up ? -1 : 0);
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      x /= len; y /= len; // normalize for diagonal
    }
    return { x, y };
  }

  isSprinting() {
    return this.wasd.shift.isDown || this.cursors.shift?.isDown;
  }

  isPauseJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.wasd.esc);
  }

  isMuteJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.wasd.m);
  }

  isInventoryJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.wasd.i);
  }

  isQuitJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.wasd.q);
  }

  isEnterJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.wasd.enter);
  }
}


