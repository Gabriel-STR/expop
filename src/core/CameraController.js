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
      zoomStep = 0.1,
      dragMultiplier = 1.0,
      enableDragPan = false
    } = opts;

    this.defaultZoom = zoom;
    this.defaultRotationDeg = rotationDeg;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoomStep = zoomStep;
    this.lerpX = lerpX;
    this.lerpY = lerpY;
    this.followTarget = target;
    this.isFollowing = true;
    this.dragMultiplier = dragMultiplier;
    this.enableDragPan = enableDragPan;

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

    // Optional right-click drag panning (disabled unless enableDragPan)
    this._isDragging = false;
    this._dragStartWorld = { x: 0, y: 0 };
    this._dragStartScroll = { x: 0, y: 0 };
    if (this.enableDragPan) {
      this._onPointerDown = (pointer, currentlyOver) => {
        const over = Array.isArray(currentlyOver) ? currentlyOver : [];
        if (pointer.rightButtonDown() && over.length === 0) {
          this._beginDrag(pointer);
        }
      };
      this._onPointerMove = (pointer) => {
        if (!this._isDragging) return;
        // Keep the world point under the cursor stable while dragging
        const dx = (this._dragStartWorld.x - pointer.worldX) * this.dragMultiplier;
        const dy = (this._dragStartWorld.y - pointer.worldY) * this.dragMultiplier;
        this.cam.scrollX = this._dragStartScroll.x + dx;
        this.cam.scrollY = this._dragStartScroll.y + dy;
      };
      this._onPointerUp = () => {
        if (this._isDragging) this._endDrag();
      };
      this.scene.input.on('pointerdown', this._onPointerDown);
      this.scene.input.on('pointermove', this._onPointerMove);
      this.scene.input.on('pointerup', this._onPointerUp);
    }

    // Cleanup listeners on scene end
    this._cleanup = () => {
      if (this._onWheel) {
        this.scene.input.off('wheel', this._onWheel);
      }
      if (this._onPointerDown) this.scene.input.off('pointerdown', this._onPointerDown);
      if (this._onPointerMove) this.scene.input.off('pointermove', this._onPointerMove);
      if (this._onPointerUp) this.scene.input.off('pointerup', this._onPointerUp);
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

  _beginDrag(pointer) {
    this.stopFollow();
    this._isDragging = true;
    this._dragStartWorld.x = pointer.worldX;
    this._dragStartWorld.y = pointer.worldY;
    this._dragStartScroll.x = this.cam.scrollX;
    this._dragStartScroll.y = this.cam.scrollY;
  }

  _endDrag() {
    this._isDragging = false;
  }

  stopFollow() {
    if (this.isFollowing) {
      this.cam.stopFollow();
      this.isFollowing = false;
    }
  }

  resumeFollow() {
    if (!this.isFollowing && this.followTarget) {
      this.cam.startFollow(this.followTarget, true, this.lerpX, this.lerpY);
      this.isFollowing = true;
    }
  }

  panBy(deltaX, deltaY) {
    // External pan request (e.g., from UI buttons). Use world units.
    this.stopFollow();
    this.cam.scrollX += deltaX;
    this.cam.scrollY += deltaY;
  }
}


