export const ASSET_KEYS = {
  TILEMAP: 'demo_map',
  TILESET: 'tileset',
  PLAYER: 'player_sheet',
  ITEMS: 'items',
  MUSIC_THEME: 'music_theme',
  SFX_PICKUP: 'pickup',
  SFX_STEP: 'step'
};

export const DEFAULT_SAVE_SLOT = 'save1';

export const EVENTS = {
  INVENTORY_CHANGED: 'inventory:changed',
  UI_CONTEXT_SHOW: 'ui:context:show',
  UI_CONTEXT_HIDE: 'ui:context:hide',
  TASK_COMPLETED: 'task:completed',
  TASKS_UPDATED: 'tasks:updated',
  LEVEL_COMPLETED: 'level:completed',
  CHAT_MESSAGE: 'chat:message',
  UI_INVENTORY_SELECTED: 'ui:inventory:selected'
};

// Player must be within this many pixels to interact or pick up via mouse
export const INTERACTION_DISTANCE = 48;

