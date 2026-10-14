// SPDX-License-Identifier: EPL-2.0

/** Every blind-spot construct, all within every limit: the tool must exit 0. */
export class Clean {
  #count = 0;

  constructor(
    private readonly f: (key: string) => number,
    readonly items = new Map<string, number>(),
  ) {}

  #bump(by: number = 1): number {
    this.#count += by;
    return this.#count + (Math.abs(by) + 1);
  }

  next(label: readonly (string | number)[]): string {
    return `${label.length}${this.#bump()}${this.f?.('k')}`;
  }
}

export const SHAPE = (s: string): string => s.replace(/'/g, '');
