import type { PlayerId } from './constants';

interface Movement { x: number; z: number; jump: boolean; attack: boolean }

const KEY_BINDINGS: Record<PlayerId, { up: string; down: string; left: string; right: string; jump: string; attack: string }> = {
  tosia: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', attack: 'KeyQ' },
  gucio: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', jump: 'Enter', attack: 'ShiftRight' }
};

const allowed = new Set(Object.values(KEY_BINDINGS).flatMap(Object.values));

export class Input {
  private readonly down = new Set<string>();
  private readonly jumpQueue = new Set<PlayerId>();
  private readonly attackQueue = new Set<PlayerId>();

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!allowed.has(event.code)) return;
    event.preventDefault();
    if (!this.down.has(event.code)) {
      for (const id of ['tosia', 'gucio'] as const) {
        if (KEY_BINDINGS[id].jump === event.code) this.jumpQueue.add(id);
        if (KEY_BINDINGS[id].attack === event.code) this.attackQueue.add(id);
      }
    }
    this.down.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!allowed.has(event.code)) return;
    event.preventDefault();
    this.down.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.down.clear();
    this.jumpQueue.clear();
    this.attackQueue.clear();
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  get(id: PlayerId): Movement {
    const keys = KEY_BINDINGS[id];
    let x = Number(this.down.has(keys.right)) - Number(this.down.has(keys.left));
    let z = Number(this.down.has(keys.up)) - Number(this.down.has(keys.down));
    if (x && z) { x *= Math.SQRT1_2; z *= Math.SQRT1_2; }
    const jump = this.jumpQueue.delete(id);
    const attack = this.attackQueue.delete(id);
    return { x, z, jump, attack };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
