type Listener = (...args: any[]) => void;

class Emitter {
  private events: Map<string, Set<Listener>> = new Map();

  addListener(event: string, listener: Listener) {
    const set = this.events.get(event) ?? new Set();
    set.add(listener);
    this.events.set(event, set);
    return () => set.delete(listener);
  }

  emit(event: string, ...args: any[]) {
    const set = this.events.get(event);
    if (!set) return;
    set.forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        console.error('Emitter listener error', err);
      }
    });
  }
}

export const emitter = new Emitter();

export default emitter;
