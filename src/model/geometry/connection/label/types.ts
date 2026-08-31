export interface LabelGapSplit {
  before: number[] | null;
  after: number[] | null;
  bezier: boolean;
}

export interface LabelGapDash {
  dashBefore: number;
  gapLength: number;
}
