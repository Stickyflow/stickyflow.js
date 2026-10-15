export interface SurfaceClock {
  now(): number;
  paused(): boolean;
  spent(): number;
  setPaused(paused: boolean): void;
}

export function createSurfaceClock(view: Window | null | undefined): SurfaceClock {
  let pausedSince: number | null = null;
  let spentPaused = 0;
  const real = () => (view?.performance.now() ?? 0) / 1000;
  return {
    now: () => (pausedSince ?? real()) - spentPaused,
    paused: () => pausedSince !== null,
    spent: () => spentPaused,
    setPaused(paused) {
      if (paused && pausedSince === null) {
        pausedSince = real();
      } else if (!paused && pausedSince !== null) {
        spentPaused += real() - pausedSince;
        pausedSince = null;
      }
    },
  };
}
