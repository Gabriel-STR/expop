import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = gameConfig();
config.scene = [BootScene, MenuScene, GameScene, UIScene];

// eslint-disable-next-line no-new
new Phaser.Game(config);


