export default class TaskSystem {
  constructor(scene) {
    this.scene = scene;
    this.tasks = new Map();
    this.completed = new Set();
  }

  upsertTask(task) {
    // task: { id, title, description, completed }
    const prev = this.tasks.get(task.id) || {};
    const merged = { ...prev, ...task };
    if (merged.completed) this.completed.add(merged.id);
    this.tasks.set(merged.id, merged);
    this._emitTasksUpdated();
    this._checkAllCompletedAndEmit();
  }

  removeTask(taskId) {
    this.tasks.delete(taskId);
    this.completed.delete(taskId);
    this._emitTasksUpdated();
  }

  listTasks() {
    return Array.from(this.tasks.values());
  }

  isCompleted(taskId) {
    return this.completed.has(taskId);
  }

  markCompleted(taskId) {
    if (this.completed.has(taskId)) return;
    this.completed.add(taskId);
    const t = this.tasks.get(taskId);
    if (t) {
      this.tasks.set(taskId, { ...t, completed: true });
      this._emitTasksUpdated();
    }
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('task:completed', { id: taskId });
    }
    this._checkAllCompletedAndEmit();
  }

  markLevelCompleted(payload = {}) {
    // Deprecated: Level completion is now driven by all tasks completed
    this._checkAllCompletedAndEmit(payload);
  }

  _emitTasksUpdated() {
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('tasks:updated', this.listTasks());
    }
  }

  _checkAllCompletedAndEmit(extraPayload = {}) {
    const allTasks = this.listTasks();
    if (!allTasks.length) return;
    const allDone = allTasks.every((t) => !!t.completed);
    if (allDone && this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('level:completed', { reason: 'all_tasks_completed', ...extraPayload });
    }
  }
}


