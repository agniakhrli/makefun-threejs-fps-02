// Bomb objective: plant at Site A or B, defuse timer.
export function createObjective() {
  const state = {
    planted: false,
    site: null,
    timer: 45, // 45 seconds to detonate
    defusing: false,
    defuseTimer: 5,
  };

  return {
    state,
    plant(siteName) {
      if (state.planted) return false;
      state.planted = true;
      state.site = siteName;
      state.timer = 45;
      return true;
    },
    defuse() {
      state.planted = false;
      state.site = null;
      state.defusing = false;
      state.defuseTimer = 5;
    },
    step(dt) {
      if (state.planted) {
        state.timer = Math.max(0, state.timer - dt);
        if (state.defusing) {
          state.defuseTimer = Math.max(0, state.defuseTimer - dt);
        }
      }
    },
    reset() {
      state.planted = false;
      state.site = null;
      state.timer = 45;
      state.defusing = false;
      state.defuseTimer = 5;
    },
  };
}
