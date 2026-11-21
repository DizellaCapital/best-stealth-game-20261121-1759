// LANTERN HEIST — input.js
// Keyboard state plus mouse position and clicks, in canvas coordinates.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.clicked = null;
    this.pressed = new Set();
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
      this.mouse.inside = true;
    });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      this.clicked = {
        x: ((e.clientX - r.left) / r.width) * canvas.width,
        y: ((e.clientY - r.top) / r.height) * canvas.height,
      };
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // True once, on the frame the key went down.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  takeClick() {
    const c = this.clicked;
    this.clicked = null;
    return c;
  }

  endFrame() {
    this.pressed.clear();
  }
}
