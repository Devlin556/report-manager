import ExcelJS from 'exceljs';
import {
  ChartDataPoint,
  TemplateModuleConfig,
  WorkerInput,
  formatNumber,
  isChartDataArray,
  isObjectArray,
  resolveDataKey,
} from './worker.types';

// ─── Palette ─────────────────────────────────────────────────────────────────

const COLOR = {
  headerFill: '1E3A5F',
  headerFont: 'FFFFFF',
  evenRow: 'F1F5F9',
  oddRow: 'FFFFFF',
  border: 'CBD5E1',
  chartHeader: '1E40AF',
  chartHeaderFont: 'FFFFFF',
  accent: '3B82F6',
  accentLight: 'BFDBFE',
  sectionBg: 'EFF6FF',
  sectionFont: '1E40AF',
  totalRow: 'DBEAFE',
  totalFont: '1E3A5F',
} as const;

type ArgbColor = { argb: string };

function argb(hex: string): ArgbColor {
  return { argb: `FF${hex}` };
}

function solidFill(hex: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: argb(hex) };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: argb(COLOR.border) };
  return { top: side, bottom: side, left: side, right: side };
}

// ─── Chart visualizations via unicode ─────────────────────────────────────────

const BAR_CHARS = '▏▎▍▌▋▊▉█';
const SPARKLINE_CHARS = '▁▂▃▄▅▆▇█'; // vertical bars for column/line
const PIE_FILL = '●';
const PIE_EMPTY = '○';

function makeUnicodeBar(value: number, maxValue: number, width = 20): string {
  if (maxValue === 0) return '░'.repeat(width);
  const ratio = Math.min(value / maxValue, 1);
  const filled = Math.floor(ratio * width);
  const partial = Math.floor((ratio * width - filled) * BAR_CHARS.length);
  const partialChar = partial > 0 ? BAR_CHARS[partial - 1] : '';
  const empty = width - filled - (partialChar ? 1 : 0);
  return '█'.repeat(filled) + partialChar + '░'.repeat(Math.max(empty, 0));
}

function makeColumnBar(value: number, maxValue: number, width = 20): string {
  if (maxValue === 0) return '▁'.repeat(1);
  const idx = Math.min(Math.floor((value / maxValue) * SPARKLINE_CHARS.length), SPARKLINE_CHARS.length - 1);
  const char = SPARKLINE_CHARS[Math.max(idx, 0)] ?? '▁';
  return char.repeat(Math.min(width, 24));
}

function makePieSlice(value: number, total: number, width = 12): string {
  if (total === 0) return PIE_EMPTY.repeat(width);
  const ratio = Math.min(value / total, 1);
  const filled = Math.round(ratio * width);
  return PIE_FILL.repeat(filled) + PIE_EMPTY.repeat(width - filled);
}

function makeSparkline(values: number[], width = 20): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const indices = values.length <= width
    ? values.map((v) => Math.min(Math.floor((v / max) * (SPARKLINE_CHARS.length - 1)), SPARKLINE_CHARS.length - 1))
    : values
        .filter((_, i) => i % Math.ceil(values.length / width) === 0)
        .slice(0, width)
        .map((v) => Math.min(Math.floor((v / max) * (SPARKLINE_CHARS.length - 1)), SPARKLINE_CHARS.length - 1));
  return indices.map((i) => SPARKLINE_CHARS[Math.max(i, 0)] ?? '▁').join('');
}

// ─── Column auto-detection ────────────────────────────────────────────────────

function detectColumns(
  rows: Record<string, unknown>[],
  config: TemplateModuleConfig,
): string[] {
  if (config?.columns?.length) return config.columns;
  if (!rows?.length || rows[0] == null) return [];
  return Object.keys(rows[0]);
}

function columnWidth(key: string): number {
  const lengths: Record<string, number> = {
    lastName: 16,
    firstName: 16,
    birthDate: 14,
    visitDate: 14,
    diagnosis: 18,
    name: 22,
    count: 12,
    cost: 14,
    doctor: 28,
    month: 12,
    revenue: 16,
    expenses: 16,
    department: 18,
    percentage: 12,
  };
  return lengths[key] ?? 18;
}

// ─── Sheet renderer ───────────────────────────────────────────────────────────

function renderSheet(
  workbook: ExcelJS.Workbook,
  value: unknown,
  config: TemplateModuleConfig,
): void {
  if (value == null) return;

  const sheetName = (config?.name ?? 'Лист').slice(0, 31);
  const ws = workbook.addWorksheet(sheetName);

  if (isObjectArray(value)) {
    const rows = value as Record<string, unknown>[];
    const columns = detectColumns(rows, config);

    // Column definitions
    ws.columns = columns.map((key) => ({
      header: key,
      key,
      width: columnWidth(key),
    }));

    // Style header row
    const headerRow = ws.getRow(1);
    if (!headerRow) return;
    headerRow.height = 22;
    headerRow.font = { bold: true, color: argb(COLOR.headerFont), size: 10 };
    headerRow.fill = solidFill(COLOR.headerFill);
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.border = thinBorder();
    });

    // Data rows with alternating fills
    rows.forEach((row, i) => {
      const wsRow = ws.addRow(row);
      wsRow.height = 16;
      wsRow.fill = solidFill(i % 2 === 0 ? COLOR.oddRow : COLOR.evenRow);
      wsRow.font = { size: 9 };
      wsRow.alignment = { vertical: 'middle' };
      wsRow.eachCell((cell) => {
        cell.border = thinBorder();
      });
    });

    // Total row
    const totalRow = ws.addRow({});
    totalRow.height = 18;
    totalRow.font = { bold: true, size: 9, color: argb(COLOR.totalFont) };
    totalRow.fill = solidFill(COLOR.totalRow);
    columns.forEach((col, i) => {
      const cell = totalRow.getCell(i + 1);
      if (i === 0) {
        cell.value = `Итого: ${rows.length} записей`;
      }
      cell.border = thinBorder();
    });

    // AutoFilter and freeze
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
  } else if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    // Key-value table for summary/metadata objects
    const obj = value as Record<string, unknown>;
    ws.columns = [
      { header: 'Параметр', key: 'key', width: 30 },
      { header: 'Значение', key: 'val', width: 30 },
    ];
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: argb(COLOR.headerFont), size: 10 };
    headerRow.fill = solidFill(COLOR.headerFill);
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.border = thinBorder();
    });

    Object.entries(obj).forEach(([k, v], i) => {
      const wsRow = ws.addRow({ key: k, val: String(v ?? '—') });
      wsRow.fill = solidFill(i % 2 === 0 ? COLOR.oddRow : COLOR.evenRow);
      wsRow.font = { size: 9 };
      wsRow.eachCell((cell) => {
        cell.border = thinBorder();
      });
    });
  }
}

// ─── Chart sheet renderer ─────────────────────────────────────────────────────

type ChartVizType = 'bar' | 'column' | 'pie' | 'doughnut' | 'line';

function getVizCell(
  chartType: ChartVizType,
  point: ChartDataPoint,
  maxVal: number,
  total: number,
): string {
  switch (chartType) {
    case 'pie':
    case 'doughnut':
      return makePieSlice(point.value, total, 16);
    case 'column':
      return makeColumnBar(point.value, maxVal, 20);
    case 'line':
      return ''; // handled separately in loop
    case 'bar':
    default:
      return makeUnicodeBar(point.value, maxVal, 24);
  }
}

function renderChartSheet(
  workbook: ExcelJS.Workbook,
  value: unknown,
  config: TemplateModuleConfig,
): void {
  const sheetName = (config.name ?? 'График').slice(0, 28);
  const ws = workbook.addWorksheet(sheetName);

  if (!isChartDataArray(value) || value.length === 0) return;

  const points = value as ChartDataPoint[];
  const chartType = (config.chartType ?? 'bar') as ChartVizType;
  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const totalSum = points.reduce((s, p) => s + p.value, 0);
  const sortedPoints = [...points].sort((a, b) => b.value - a.value);
  const allValues = sortedPoints.map((p) => p.value);

  const pctHeader = chartType === 'pie' || chartType === 'doughnut' ? '% от общего' : '% от макс.';
  const vizHeader = chartType === 'pie' ? 'Доля' : chartType === 'doughnut' ? 'Кольцо' : chartType === 'line' ? 'Тренд' : 'Визуализация';

  ws.columns = [
    { header: 'Параметр', key: 'label', width: 28 },
    { header: 'Значение', key: 'value', width: 16 },
    { header: pctHeader, key: 'pct', width: 14 },
    { header: vizHeader, key: 'bar', width: 36 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: argb(COLOR.chartHeaderFont), size: 10 };
  headerRow.fill = solidFill(COLOR.chartHeader);
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.border = thinBorder();
  });

  sortedPoints.forEach((point, i) => {
    const pctVal = chartType === 'pie' || chartType === 'doughnut'
      ? (point.value / totalSum) * 100
      : (point.value / maxVal) * 100;
    const pct = `${pctVal.toFixed(1)}%`;
    const viz = chartType === 'line'
      ? makeSparkline(allValues, 24)
      : getVizCell(chartType, point, maxVal, totalSum);

    const wsRow = ws.addRow({ label: point.label, value: point.value, pct, bar: viz });
    wsRow.height = 18;
    wsRow.font = { size: 9 };
    wsRow.alignment = { vertical: 'middle' };

    const ratio = chartType === 'pie' || chartType === 'doughnut' ? point.value / totalSum : point.value / maxVal;
    const intensity = Math.floor(ratio * 180);
    const r = Math.max(255 - intensity, 50);
    const g = Math.max(255 - Math.floor(intensity * 0.4), 100);
    const b = 255;
    const rHex = r.toString(16).padStart(2, '0').toUpperCase();
    const gHex = g.toString(16).padStart(2, '0').toUpperCase();
    const bHex = b.toString(16).padStart(2, '0').toUpperCase();

    wsRow.getCell('bar').fill = solidFill(`${rHex}${gHex}${bHex}`);
    wsRow.getCell('bar').font = { size: 9, color: argb('1E3A5F'), bold: true };

    wsRow.fill = solidFill(i % 2 === 0 ? COLOR.oddRow : COLOR.evenRow);
    wsRow.getCell('bar').fill = solidFill(`${rHex}${gHex}${bHex}`);

    wsRow.eachCell((cell) => {
      cell.border = thinBorder();
    });
  });

  ws.addRow({});
  const totalRowViz = chartType === 'pie' || chartType === 'doughnut'
    ? makePieSlice(1, 1, 16)
    : makeUnicodeBar(1, 1, 24);
  const sumRow = ws.addRow({
    label: 'ИТОГО',
    value: totalSum,
    pct: chartType === 'pie' || chartType === 'doughnut' ? '100%' : '100%',
    bar: totalRowViz,
  });
  sumRow.height = 20;
  sumRow.font = { bold: true, size: 10, color: argb(COLOR.totalFont) };
  sumRow.fill = solidFill(COLOR.totalRow);
  sumRow.eachCell((cell) => {
    cell.border = thinBorder();
  });

  const lastDataRow = 1 + sortedPoints.length;
  ws.addConditionalFormatting({
    ref: `B2:B${lastDataRow}`,
    rules: [
      {
        type: 'colorScale',
        priority: 1,
        cfvo: [{ type: 'min' }, { type: 'max' }],
        color: [argb(COLOR.accentLight), argb(COLOR.accent)],
      },
    ],
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

// ─── Worker entry point ───────────────────────────────────────────────────────

export default async function xlsxWorker(input: WorkerInput): Promise<Buffer> {
  const { template, data } = input;
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Report Manager';
  workbook.created = new Date();
  workbook.title = String(data['title'] ?? template.reportType);

  const modules = Array.isArray(template.modules) ? template.modules : [];
  let hasSomething = false;

  for (const mod of modules) {
    const value = resolveDataKey(data, mod.dataKey);
    const config = mod.config ?? {};

    switch (mod.type) {
      case 'sheet':
        if (value != null) {
          renderSheet(workbook, value, config);
          hasSomething = true;
        }
        break;

      case 'chart':
        if (value != null && isChartDataArray(value)) {
          renderChartSheet(workbook, value, config);
          hasSomething = true;
        }
        break;

      default:
        break;
    }
  }

  if (!hasSomething || workbook.worksheets.length === 0) {
    const ws = workbook.addWorksheet('Report');
    ws.addRow(['Нет данных для отображения']);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
