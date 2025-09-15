import Phaser from 'phaser';

export default class CameraController {
  constructor(scene, target, opts = {}) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    const {
      zoom = 1.25,
      rotationDeg = 0,
      lerpX = 0.1,
      lerpY = 0.1,
      deadzone = { w: 160, h: 120 },
      minZoom = 0.5,
      maxZoom = 7,
      zoomStep = 0.1
    } = opts;

    this.defaultZoom = zoom;
    this.defaultRotationDeg = rotationDeg;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoomStep = zoomStep;

    this.cam.setZoom(zoom);
    this.cam.startFollow(target, true, lerpX, lerpY);
    this.cam.setRotation(Phaser.Math.DegToRad(rotationDeg));
    this.cam.setDeadzone(deadzone.w, deadzone.h);

    // Debug keys
    this.keys = this.scene.input.keyboard.addKeys({
      resetC: Phaser.Input.Keyboard.KeyCodes.C,
      zoomIn: Phaser.Input.Keyboard.KeyCodes.X,
      zoomOut: Phaser.Input.Keyboard.KeyCodes.Z
    });

    // Mouse wheel zoom
    this._onWheel = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const direction = deltaY < 0 ? 1 : -1; // up: zoom in, down: zoom out
      const nextZoom = Phaser.Math.Clamp(this.cam.zoom + direction * this.zoomStep, this.minZoom, this.maxZoom);
      this.cam.setZoom(nextZoom);
    };
    this.scene.input.on('wheel', this._onWheel);

    // Cleanup listeners on scene end
    this._cleanup = () => {
      if (this._onWheel) {
        this.scene.input.off('wheel', this._onWheel);
      }
    };
    this.scene.events.on('shutdown', this._cleanup);
    this.scene.events.on('destroy', this._cleanup);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.resetC)) {
      this.cam.setRotation(Phaser.Math.DegToRad(this.defaultRotationDeg));
      this.cam.setZoom(this.defaultZoom);
    }
    if (this.keys.zoomIn.isDown) {
      this.cam.setZoom(Phaser.Math.Clamp(this.cam.zoom + 0.01, this.minZoom, this.maxZoom));
    }
    if (this.keys.zoomOut.isDown) {
      this.cam.setZoom(Phaser.Math.Clamp(this.cam.zoom - 0.01, this.minZoom, this.maxZoom));
    }
  }
}


