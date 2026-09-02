export interface LabelGapSplit {
  before: number[] | null;
  after: number[] | null;
  bezier: boolean;
}

export interface LabelGapClearance {
  halfWidth: number;
  halfHeight: number;
  minimumVisibleStub: number;
}

export interface LabelGapDash {
  dashBefore: number;
  gapLength: number;
}
