export class Input {
  private held = new Set<string>()
  private _onKeyDown: (e: KeyboardEvent) => void
  private _onKeyUp: (e: KeyboardEvent) => void

  constructor() {
    this._onKeyDown = (e: KeyboardEvent) => {
      this.held.add(e.code)
      if (e.code === 'Space') e.preventDefault()
    }
    this._onKeyUp = (e: KeyboardEvent) => this.held.delete(e.code)
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
  }

  isDown(code: string): boolean { return this.held.has(code) }

  get forward(): boolean   { return this.isDown('KeyW') || this.isDown('ArrowUp') }
  get backward(): boolean  { return this.isDown('KeyS') || this.isDown('ArrowDown') }
  get left(): boolean      { return this.isDown('KeyA') || this.isDown('ArrowLeft') }
  get right(): boolean     { return this.isDown('KeyD') || this.isDown('ArrowRight') }
  get handbrake(): boolean { return this.isDown('Space') }
}
