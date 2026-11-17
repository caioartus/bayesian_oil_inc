// Global game object: current scene, fade transitions and the play state.
export const W = 320;
export const H = 180;

export const game = {
  scene: null,
  pending: null,
  fade: 1, // 0 = clear, 1 = black
  fadeDir: -1,
  state: null,

  go(scene) {
    if (this.pending) return;
    this.pending = scene;
    this.fadeDir = 1;
  },

  update(dt) {
    if (this.fadeDir) {
      this.fade += this.fadeDir * dt * 4;
      if (this.fade >= 1 && this.fadeDir > 0) {
        this.fade = 1;
        this.scene = this.pending;
        this.pending = null;
        this.scene.enter?.();
        this.fadeDir = -1;
      } else if (this.fade <= 0 && this.fadeDir < 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }
  },

  start(scene) {
    this.scene = scene;
    scene.enter?.();
    this.fade = 1;
    this.fadeDir = -1;
  },
};
