import { CHART_TYPES, type ChartType, isChartType } from '../../../model/chart';
import type { SflBlock, SflDocument } from '../../ast';
import { childBlocks, contentChildren, directProperties, styleProperties } from '../blockEntries';
import type { SflDiagnostic } from '../types';
import { asString } from '../valueAccess';

const NATIVE_CIRCULAR_CHART_TYPES: ReadonlySet<ChartType> = new Set(['radar', 'radial']);
const OPTIONAL_CIRCULAR_GRID_CHART_TYPES: ReadonlySet<ChartType> = new Set(['scatter', 'custom', 'hexbin']);

export function collectUnsupportedChartTypes(doc: SflDocument): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];

  const visit = (block: SflBlock): void => {
    if (block.kind === 'Chart') {
      const declared = asString(directProperties(block).get('type'));
      if (declared !== undefined && !isChartType(declared)) {
        diagnostics.push({
          severity: 'warning',
          code: 'unsupported-chart-type',
          entityId: block.name,
          message: `Unsupported chart type '${declared}' — drawn as a plain series plot. Supported: ${CHART_TYPES.join(', ')}.`,
        });
      }
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };

  for (const block of doc.blocks) {
    visit(block);
  }
  return diagnostics;
}

export function collectEmptySeries(doc: SflDocument): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];

  const visit = (block: SflBlock): void => {
    if (block.kind === 'Chart') {
      for (const series of contentChildren(block).filter(child => child.kind === 'Series')) {
        if (!directProperties(series).has('values')) {
          diagnostics.push({
            severity: 'warning',
            code: 'series-without-values',
            entityId: series.name,
            message: `Series '${series.name}' has no values. If this was meant to be an Axis or Rule, it needs that keyword in front of the name — inside data{}, a bare name is read as a Series.`,
          });
        }
      }
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };

  for (const block of doc.blocks) {
    visit(block);
  }
  return diagnostics;
}

export function collectUnsupportedGridShapes(doc: SflDocument): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];

  const visit = (block: SflBlock): void => {
    if (block.kind === 'Chart') {
      const declared = asString(directProperties(block).get('type'));
      const chartType = isChartType(declared) ? declared : 'bar';
      const gridShape = asString(styleProperties(block).get('gridShape'));
      if (
        gridShape === 'circle' &&
        !OPTIONAL_CIRCULAR_GRID_CHART_TYPES.has(chartType) &&
        !NATIVE_CIRCULAR_CHART_TYPES.has(chartType)
      ) {
        diagnostics.push({
          severity: 'warning',
          code: 'unsupported-grid-shape',
          entityId: block.name,
          message: `gridShape: circle isn't supported on '${chartType}' — drawn with the standard rectangular grid instead. Supported: ${[...OPTIONAL_CIRCULAR_GRID_CHART_TYPES].join(', ')}.`,
        });
      }
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };

  for (const block of doc.blocks) {
    visit(block);
  }
  return diagnostics;
}
