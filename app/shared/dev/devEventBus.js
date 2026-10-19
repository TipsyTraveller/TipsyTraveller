/**
 * Lightweight event bus for communicating between Dev Portal and active game screens.
 */

const listeners = {};

export const devEventBus = {
  on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = new Set();
    }
    listeners[event].add(callback);
    return () => {
      listeners[event]?.delete(callback);
    };
  },
  emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.warn(`[devEventBus] Error in listener for ${event}:`, error);
        }
      });
    }
  },
};
