Phaser 3 Top‑Down Starter (JS, Vite)
====================================

A production‑ready starter for a 2D top‑down game using Phaser 3 (Arcade Physics) with a 45° camera rotation for visual tilt. Pure JavaScript (ES modules), Vite bundler, minimal assets prewired.

Quick Start
-----------

```bash
npm i
npm run dev
```

- Build: `npm run build`
- Preview: `npm run preview`

Open `http://localhost:5173`.

Features
--------

- Phaser 3 (Arcade) top‑down template
- 45° camera tilt via camera rotation (gameplay remains 2D)
- Scenes: Boot, Menu, Game, UI overlay
- Input: WASD/Arrows, Shift sprint, Esc pause, Q save & quit, I inventory, M mute
- Inventory with `localStorage` persistence
- Audio manager with BGM/SFX, mute and volume persisted
- Minimal tilemap with collision, pickups (coin/potion/key)

Project Structure
-----------------

```
phaser-topdown-starter/
├─ package.json
├─ vite.config.js
├─ index.html
├─ src/
│  ├─ main.js
│  ├─ config/gameConfig.js
│  ├─ scenes/
│  │  ├─ BootScene.js
│  │  ├─ MenuScene.js
│  │  ├─ GameScene.js
│  │  └─ UIScene.js
│  ├─ core/
│  │  ├─ CameraController.js
│  │  ├─ InputController.js
│  │  ├─ InventoryManager.js
│  │  ├─ DataStore.js
│  │  └─ AudioManager.js
│  ├─ objects/
│  │  ├─ Player.js
│  │  ├─ Item.js
│  │  └─ ItemPickup.js
│  ├─ utils/
│  │  ├─ constants.js
│  │  └─ helpers.js
│  └─ assets/
│     ├─ images/
│     │  ├─ tileset.png
│     │  └─ items.png
│     ├─ sprites/
│     │  └─ player_sheet.png
│     ├─ audio/
│     │  ├─ music_theme.mp3
│     │  ├─ pickup.wav
│     │  └─ step.wav
│     └─ tilemaps/
│        └─ demo_map.json
└─ README.md
```

Note: The running template uses generated placeholder textures and audio so it works out‑of‑the‑box. You can replace assets with files at the above paths.

Assets & Animations
-------------------

- Player spritesheet expected: 32x32 frames. Suggested rows:
  - Row 0: down (2+ frames)
  - Row 1: up (2+ frames)
  - Row 2: side (2+ frames)
- Items spritesheet: 32x32 tiles. Frames IDs used: `COIN`, `POTION`, `KEY`.
- Tileset: 32x32 tiles. Index 0 floor, 1 wall (collides).
- Audio: provide your own files and update paths/keys if needed.

To use your own assets, drop them in `src/assets/...` and update the loaders in `BootScene` and animation creation accordingly.

Tilemap & Collision
-------------------

- Tiled JSON (`src/assets/tilemaps/demo_map.json`) with a `World` tile layer.
- Collision is enabled on tiles with property `{ collides: true }`.
- Update collisions in Tiled or by `setCollisionByProperty({ collides: true })` in `GameScene`.

Save Data
---------

- Stored under `localStorage["phaserTopdown.save1"]`.
- Example schema:

```json
{
  "version": 1,
  "settings": { "muted": false, "volume": 0.8 },
  "player": { "x": 64, "y": 64, "hp": 100 },
  "inventory": [{ "id": "COIN", "qty": 5 }]
}
```

- Reset: delete the key in browser DevTools or use the "New Game" option.

Camera Tilt
-----------

The main camera is rotated 45° using `camera.setRotation(Phaser.Math.DegToRad(45))`. Movement and collisions remain axis‑aligned; only the view tilts. Use keys: `C` to reset, `Z/X` to zoom.

Notes
-----

- Pure JavaScript (no TypeScript) and ES modules
- `pixelArt: true` and `roundPixels: true` keep retro crispness
- UI runs in a separate scene so it isn’t affected by camera rotation

Attribution
-----------

- Phaser 3: `https://phaser.io/`


# expop
