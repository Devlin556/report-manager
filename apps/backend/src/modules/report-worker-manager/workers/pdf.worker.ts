import path from 'path';
import PDFDocument from 'pdfkit';
import {
    ChartDataPoint,
    WorkerInput,
    formatNumber,
    isChartDataArray,
    isObjectArray,
    resolveDataKey,
    sampleArray,
} from './worker.types';

// Fonts with Cyrillic support (DejaVu)
const FONT_REGULAR = path.join(
    path.dirname(require.resolve('dejavu-fonts-ttf/package.json')),
    'ttf',
    'DejaVuSans.ttf',
);
const FONT_BOLD = path.join(
    path.dirname(require.resolve('dejavu-fonts-ttf/package.json')),
    'ttf',
    'DejaVuSans-Bold.ttf',
);

// ─── Palette ────────────────────────────────────────────────────────────────

const COLOR = {
    primary: '#2563EB',
    primaryDark: '#1E40AF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    textLight: '#94A3B8',
    headerBg: '#1E3A5F',
    evenRow: '#F1F5F9',
    chartBar: '#3B82F6',
    chartLine: '#2563EB',
    chartDot: '#1D4ED8',
    axisLine: '#CBD5E1',
} as const;

// ─── Layout constants ────────────────────────────────────────────────────────

const PAGE = { width: 595, height: 842 };
const MARGIN = 50;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

// ─── Utility helpers ─────────────────────────────────────────────────────────

function checkPageBreak(doc: PDFDocument.PDFDocument, neededHeight: number): void {
    const remaining = PAGE.height - MARGIN - doc.y;
    if (remaining < neededHeight) {
        doc.addPage();
    }
}

function truncate(str: string, maxLen: number): string {
    const s = String(str);
    return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

// ─── Module renderers ────────────────────────────────────────────────────────

function renderHeader(doc: PDFDocument.PDFDocument, value: unknown): void {
    const text = String(value ?? 'Отчет');
    checkPageBreak(doc, 80);
    const headerTop = doc.y;
    const headerHeight = 52;

    doc.rect(MARGIN - 10, headerTop, CONTENT_WIDTH + 20, headerHeight).fill(COLOR.headerBg);

    doc.fontSize(20)
        .fillColor('#FFFFFF')
        .font('DejaVuSans-Bold')
        .text(text, MARGIN, headerTop + 14, {
            width: CONTENT_WIDTH,
            align: 'center',
            lineBreak: false,
        });
    doc.font('DejaVuSans');

    doc.y = headerTop + headerHeight + 12;
    doc.fillColor(COLOR.text);
}

function renderSection(
    doc: PDFDocument.PDFDocument,
    config: { title?: string },
    value: unknown,
): void {
    const title = config.title ?? String(value ?? '');
    checkPageBreak(doc, 40);
    doc.moveDown(0.5);
    doc.fontSize(13)
        .fillColor(COLOR.primaryDark)
        .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveTo(MARGIN, doc.y + 2)
        .lineTo(MARGIN + CONTENT_WIDTH, doc.y + 2)
        .strokeColor(COLOR.primary)
        .lineWidth(1.5)
        .stroke();
    doc.moveDown(0.8).fillColor(COLOR.text);
}

function renderTextBlocks(doc: PDFDocument.PDFDocument, value: unknown): void {
    const blocks = Array.isArray(value) ? (value as string[]) : [];
    blocks.forEach((block) => {
        checkPageBreak(doc, 60);
        doc.fontSize(10)
            .fillColor(COLOR.text)
            .text(String(block), MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'justify' });
        doc.moveDown(0.7);
    });
}

function renderTable(
    doc: PDFDocument.PDFDocument,
    value: unknown,
    config: { columns?: string[] },
): void {
    if (!isObjectArray(value) || value.length === 0) return;

    const allKeys = Object.keys(value[0]);
    const columns = config.columns?.length ? config.columns : allKeys;

    const colWidth = Math.floor(CONTENT_WIDTH / columns.length);
    const rowHeight = 18;
    const headerHeight = 22;

    checkPageBreak(doc, headerHeight + rowHeight * 3);

    const startX = MARGIN;

    // Header
    doc.rect(startX, doc.y, CONTENT_WIDTH, headerHeight).fill(COLOR.primary);
    const headerY = doc.y;
    columns.forEach((col, i) => {
        doc.fontSize(9)
            .fillColor('#FFFFFF')
            .font('DejaVuSans-Bold')
            .text(truncate(col, 16), startX + i * colWidth + 4, headerY + 6, {
                width: colWidth - 8,
                align: 'left',
                lineBreak: false,
            });
    });
    doc.font('DejaVuSans').moveDown(0);
    let currentY = headerY + headerHeight;

    // Rows
    value.forEach((row, rowIndex) => {
        doc.y = currentY; // keep doc.y in sync for checkPageBreak
        checkPageBreak(doc, rowHeight + 2);
        // After addPage(), doc.y resets to top; detect new page and re-draw header
        if (doc.y < currentY - 50) {
            currentY = doc.y;
            // Re-draw header on new page
            doc.rect(startX, currentY, CONTENT_WIDTH, headerHeight).fill(COLOR.primary);
            columns.forEach((col, i) => {
                doc.fontSize(9)
                    .fillColor('#FFFFFF')
                    .font('DejaVuSans-Bold')
                    .text(truncate(col, 16), startX + i * colWidth + 4, currentY + 6, {
                        width: colWidth - 8,
                        align: 'left',
                        lineBreak: false,
                    });
            });
            doc.font('DejaVuSans');
            currentY += headerHeight;
        }

        const bgColor = rowIndex % 2 === 0 ? '#FFFFFF' : COLOR.evenRow;
        doc.rect(startX, currentY, CONTENT_WIDTH, rowHeight).fill(bgColor);

        // Cell borders
        doc.rect(startX, currentY, CONTENT_WIDTH, rowHeight)
            .strokeColor(COLOR.border)
            .lineWidth(0.4)
            .stroke();

        columns.forEach((col, i) => {
            const cellValue = row[col];
            const cellText = cellValue != null ? truncate(String(cellValue), 20) : '—';
            doc.fontSize(8.5)
                .fillColor(COLOR.text)
                .text(cellText, startX + i * colWidth + 4, currentY + 5, {
                    width: colWidth - 8,
                    align: 'left',
                    lineBreak: false,
                });
        });

        currentY += rowHeight;
    });

    doc.y = currentY + 8;
    doc.moveDown(0.5);
}

// ─── Chart rendering ──────────────────────────────────────────────────────────

const CHART = {
    width: CONTENT_WIDTH,
    height: 170,
    padLeft: 58,
    padBottom: 38,
    padTop: 24,
    padRight: 16,
};

function chartPlotArea() {
    return {
        x: MARGIN + CHART.padLeft,
        y: 0, // set dynamically
        w: CHART.width - CHART.padLeft - CHART.padRight,
        h: CHART.height - CHART.padTop - CHART.padBottom,
    };
}

function drawBarChart(doc: PDFDocument.PDFDocument, points: ChartDataPoint[], title: string): void {
    checkPageBreak(doc, CHART.height + 30);

    const chartTopY = doc.y;
    const area = chartPlotArea();
    area.y = chartTopY + CHART.padTop;
    const baseY = area.y + area.h;

    const sampled = sampleArray(points, 24);
    const maxVal = Math.max(...sampled.map((p) => p.value), 1);

    // Chart title
    doc.fontSize(10)
        .fillColor(COLOR.textMuted)
        .font('DejaVuSans-Bold')
        .text(title, MARGIN, chartTopY, { width: CHART.width, align: 'center' });
    doc.font('DejaVuSans');

    // Background
    doc.rect(area.x, area.y, area.w, area.h).fillColor(COLOR.surface).fill();

    // Y-axis grid lines and labels
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const ratio = i / yTicks;
        const tickY = baseY - ratio * area.h;
        const tickVal = maxVal * ratio;

        doc.moveTo(area.x, tickY)
            .lineTo(area.x + area.w, tickY)
            .strokeColor(i === 0 ? COLOR.axisLine : '#E9EFF6')
            .lineWidth(i === 0 ? 1 : 0.5)
            .stroke();

        doc.fontSize(7)
            .fillColor(COLOR.textLight)
            .text(formatNumber(tickVal), MARGIN, tickY - 5, {
                width: CHART.padLeft - 6,
                align: 'right',
                lineBreak: false,
            });
    }

    // X-axis line
    doc.moveTo(area.x, baseY)
        .lineTo(area.x + area.w, baseY)
        .strokeColor(COLOR.axisLine)
        .lineWidth(1)
        .stroke();

    // Bars
    const groupW = area.w / sampled.length;
    const barW = groupW * 0.65;
    const barOffset = (groupW - barW) / 2;

    sampled.forEach((point, i) => {
        const barH = Math.max((point.value / maxVal) * area.h, 2);
        const bx = area.x + i * groupW + barOffset;
        const by = baseY - barH;

        // Gradient-like effect: slightly lighter top
        doc.rect(bx, by, barW, barH).fillColor(COLOR.chartBar).fill();
        doc.rect(bx, by, barW, Math.min(barH * 0.25, 4))
            .fillColor('#60A5FA')
            .fill();

        // X-axis label (every Nth to avoid overlap)
        const labelEvery = Math.ceil(sampled.length / 12);
        if (i % labelEvery === 0) {
            const label = truncate(point.label, 8);
            doc.fontSize(6.5)
                .fillColor(COLOR.textLight)
                .text(label, bx - 2, baseY + 5, {
                    width: barW + 4,
                    align: 'center',
                    lineBreak: false,
                });
        }
    });

    doc.y = chartTopY + CHART.height + 8;
    doc.fillColor(COLOR.text).moveDown(0.5);
}

function drawLineChart(
    doc: PDFDocument.PDFDocument,
    points: ChartDataPoint[],
    title: string,
): void {
    checkPageBreak(doc, CHART.height + 30);

    const chartTopY = doc.y;
    const area = chartPlotArea();
    area.y = chartTopY + CHART.padTop;
    const baseY = area.y + area.h;

    const sampled = sampleArray(points, 60);
    const maxVal = Math.max(...sampled.map((p) => p.value), 1);

    // Chart title
    doc.fontSize(10)
        .fillColor(COLOR.textMuted)
        .font('DejaVuSans-Bold')
        .text(title, MARGIN, chartTopY, { width: CHART.width, align: 'center' });
    doc.font('DejaVuSans');

    // Background
    doc.rect(area.x, area.y, area.w, area.h).fillColor(COLOR.surface).fill();

    // Y-axis grid + labels
    for (let i = 0; i <= 5; i++) {
        const ratio = i / 5;
        const tickY = baseY - ratio * area.h;
        doc.moveTo(area.x, tickY)
            .lineTo(area.x + area.w, tickY)
            .strokeColor(i === 0 ? COLOR.axisLine : '#E9EFF6')
            .lineWidth(i === 0 ? 1 : 0.5)
            .stroke();
        doc.fontSize(7)
            .fillColor(COLOR.textLight)
            .text(formatNumber(maxVal * ratio), MARGIN, tickY - 5, {
                width: CHART.padLeft - 6,
                align: 'right',
                lineBreak: false,
            });
    }

    // X-axis
    doc.moveTo(area.x, baseY)
        .lineTo(area.x + area.w, baseY)
        .strokeColor(COLOR.axisLine)
        .lineWidth(1)
        .stroke();

    // Compute point coordinates
    const coords = sampled.map((point, i) => ({
        x: area.x + (i / Math.max(sampled.length - 1, 1)) * area.w,
        y: baseY - (point.value / maxVal) * area.h,
        label: point.label,
    }));

    // Filled area under line
    doc.save();
    doc.moveTo(coords[0].x, baseY);
    coords.forEach((c) => doc.lineTo(c.x, c.y));
    doc.lineTo(coords[coords.length - 1].x, baseY);
    doc.closePath().fillColor('#BFDBFE').fill();
    doc.restore();

    // Line
    if (coords.length > 1) {
        doc.moveTo(coords[0].x, coords[0].y);
        coords.slice(1).forEach((c) => doc.lineTo(c.x, c.y));
        doc.strokeColor(COLOR.chartLine).lineWidth(1.8).stroke();
    }

    // Dots + x-labels
    const labelEvery = Math.ceil(coords.length / 10);
    coords.forEach((c, i) => {
        doc.circle(c.x, c.y, 2.5).fillColor(COLOR.chartDot).fill();

        if (i % labelEvery === 0) {
            const label = truncate(c.label, 10);
            doc.fontSize(6.5)
                .fillColor(COLOR.textLight)
                .text(label, c.x - 15, baseY + 5, {
                    width: 30,
                    align: 'center',
                    lineBreak: false,
                });
        }
    });

    doc.y = chartTopY + CHART.height + 8;
    doc.fillColor(COLOR.text).moveDown(0.5);
}

function renderChart(
    doc: PDFDocument.PDFDocument,
    value: unknown,
    config: { chartType?: string; title?: string },
): void {
    if (!isChartDataArray(value)) return;

    const title = config.title ?? 'График';
    if (config.chartType === 'line') {
        drawLineChart(doc, value, title);
    } else {
        drawBarChart(doc, value, title);
    }
}

// ─── Worker entry point ───────────────────────────────────────────────────────

export default async function pdfWorker(input: WorkerInput): Promise<Buffer> {
    const { template, data } = input;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: MARGIN,
            bufferPages: true,
            info: {
                Title: String(data['title'] ?? template.reportType),
                Creator: 'Report Manager',
            },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.registerFont('DejaVuSans', FONT_REGULAR);
        doc.registerFont('DejaVuSans-Bold', FONT_BOLD);
        doc.font('DejaVuSans');

        for (const mod of template.modules) {
            const value = resolveDataKey(data, mod.dataKey);

            switch (mod.type) {
                case 'header':
                    renderHeader(doc, value);
                    break;

                case 'section':
                    renderSection(doc, mod.config as { title?: string }, value);
                    break;

                case 'chart': {
                    const chartTitle = mod.config.title ?? mod.dataKey;
                    const chartType = mod.config.chartType ?? 'bar';
                    renderChart(doc, value, { chartType, title: chartTitle });
                    break;
                }

                case 'table':
                    renderTable(doc, value, { columns: mod.config.columns });
                    break;

                case 'textBlocks':
                    if (Array.isArray(value)) renderTextBlocks(doc, value);
                    break;

                case 'image':
                    // Placeholder — skip images in current implementation
                    break;

                default:
                    // Unknown module type — render as text blocks if array
                    if (Array.isArray(value)) {
                        renderTextBlocks(doc, value);
                    }
                    break;
            }
        }

        // Render textBlocks if present in data but not referenced by a module
        const textBlocks = data['textBlocks'];
        if (
            Array.isArray(textBlocks) &&
            !template.modules.some((m) => m.dataKey === 'textBlocks')
        ) {
            renderSection(doc, { title: 'Аналитика' }, null);
            renderTextBlocks(doc, textBlocks);
        }

        // Footer: page numbers — draw in-place to avoid creating extra pages
        const range = (
            doc as unknown as { bufferedPageRange(): { start?: number; count: number } }
        ).bufferedPageRange();
        const totalPages = range.count;
        const startPage = range.start ?? 0;

        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(startPage + i);
            const page = doc.page as {
                height: number;
                width: number;
                margins?: { top: number; bottom: number; left: number; right: number };
            };
            const savedMargins = page.margins ? { ...page.margins } : null;
            if (page.margins) page.margins.bottom = 0;
            const footerY = page.height - 18;
            const footerText = `Страница ${i + 1} из ${totalPages}`;

            doc.save();
            doc.fontSize(8).fillColor(COLOR.textLight);
            doc.text(footerText, 0, footerY, {
                width: page.width,
                align: 'center',
                lineBreak: false,
                height: 12,
            });
            doc.restore();
            if (savedMargins && page.margins) page.margins.bottom = savedMargins.bottom;
        }

        doc.end();
    });
}
