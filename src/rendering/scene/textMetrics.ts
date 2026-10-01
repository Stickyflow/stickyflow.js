export interface TextMetrics {
  measure: (text: string, bold: boolean) => number;
  spaceWidth: number;
}

export type MeasureTextFactory = (fontFamily: string, fontSize: number) => TextMetrics;
