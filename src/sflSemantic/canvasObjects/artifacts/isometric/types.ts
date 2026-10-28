export interface SflIsometricData {
  depth: number;
  icon?: string;
  footprint?: Array<[number, number]>;
  form: 'box' | 'sphere';
}
