export class ChartRenderOrder {
  readonly #baseOrder: number;
  #offset = 0.01;

  constructor(baseOrder: number) {
    this.#baseOrder = baseOrder;
  }

  readonly next = (): number => this.#baseOrder + this.#offset++;

  current(): number {
    return this.#baseOrder + this.#offset;
  }

  advance(nodeCount: number): void {
    this.#offset += nodeCount;
  }
}
