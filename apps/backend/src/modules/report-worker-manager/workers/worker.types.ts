export type ModuleType = 'header' | 'section' | 'table' | 'chart' | 'image' | 'sheet' | 'textBlocks';

export type ChartType = 'line' | 'bar' | 'column' | 'pie' | 'doughnut';

export interface TemplateModuleConfig {
  chartType?: ChartType;
  columns?: string[];
  name?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface TemplateModule {
  type: ModuleType;
  dataKey: string;
  config: TemplateModuleConfig;
  repeat?: boolean;
}

export interface ReportTemplate {
  reportType: string;
  format: string;
  modules: TemplateModule[];
}

export interface WorkerInput {
  reportId: string;
  template: ReportTemplate;
  data: Record<string, unknown>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export function resolveDataKey(data: unknown, key: string): unknown {
  if (!key) return data;
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, data);
}

export function isChartDataArray(value: unknown): value is ChartDataPoint[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof (value[0] as ChartDataPoint).label === 'string' &&
    typeof (value[0] as ChartDataPoint).value === 'number'
  );
}

export function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === 'object';
}

export function sampleArray<T>(arr: T[], maxCount: number): T[] {
  if (arr.length <= maxCount) return arr;
  const step = arr.length / maxCount;
  return Array.from({ length: maxCount }, (_, i) => arr[Math.floor(i * step)]);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}
