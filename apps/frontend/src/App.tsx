import { useEffect, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { useReportsStore } from './stores/reportsStore';

const REPORT_NAMES: Record<string, string> = {
    'medical-stats': 'Медицинская статистика',
    financial: 'Финансовый отчет',
    'patient-registry': 'Реестр пациентов',
    'procedure-analytics': 'Аналитика по процедурам',
};

export function App() {
    const {
        reportTypes,
        reports,
        isLoading,
        error,
        fetchTypes,
        startGeneration,
        fetchReports,
        subscribeToAllUpdates,
    } = useReportsStore();

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

    useEffect(() => {
        fetchTypes();
        fetchReports().then(() => subscribeToAllUpdates());
    }, [fetchTypes, fetchReports, subscribeToAllUpdates]);

    const handleGenerate = () => {
        if (selectedType && selectedFormat) {
            startGeneration(selectedType, selectedFormat);
        }
    };

    const handleDownload = async (reportId: string) => {
        const res = await fetch(`/api/reports/${reportId}/download-url`);
        const { url } = await res.json();
        if (url) window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="mb-8 text-2xl font-bold text-gray-900">Report Manager</h1>

            {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

            <div className="mb-8 max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Сгенерировать отчет</h2>
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-gray-600">Тип отчета</label>
                        <Select.Root
                            value={selectedType ? `${selectedType}:${selectedFormat}` : ''}
                            onValueChange={(v) => {
                                const [type, format] = v.split(':');
                                setSelectedType(type);
                                setSelectedFormat(format);
                            }}
                        >
                            <Select.Trigger className="inline-flex h-9 w-full items-center justify-between rounded border border-gray-300 bg-white px-3">
                                <Select.Value placeholder="Выберите тип" />
                                <Select.Icon />
                            </Select.Trigger>
                            <Select.Portal>
                                <Select.Content
                                    position="popper"
                                    sideOffset={4}
                                    className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded border border-gray-200 bg-white shadow-lg"
                                >
                                    <Select.Viewport className="p-1">
                                        {reportTypes.map((t) => (
                                            <Select.Item
                                                key={`${t.reportType}-${t.format}`}
                                                value={`${t.reportType}:${t.format}`}
                                                className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-gray-100"
                                            >
                                                <Select.ItemText>
                                                    {REPORT_NAMES[t.reportType] ?? t.reportType} (
                                                    {t.format})
                                                </Select.ItemText>
                                                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                                    ✓
                                                </Select.ItemIndicator>
                                            </Select.Item>
                                        ))}
                                    </Select.Viewport>
                                </Select.Content>
                            </Select.Portal>
                        </Select.Root>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!selectedType || isLoading}
                        className="inline-flex h-9 items-center rounded bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        Сгенерировать
                    </button>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Отчёты</h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-2 text-left font-medium text-gray-700">
                                    Тип
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">
                                    Формат
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">
                                    Статус
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">
                                    Дата
                                </th>
                                <th className="px-4 py-2 text-right font-medium text-gray-700">
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Нет отчётов
                                    </td>
                                </tr>
                            ) : (
                                reports.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-2 font-medium">
                                            {REPORT_NAMES[r.type] ?? r.type}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">
                                            {r.format.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                                                    r.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : r.status === 'failed'
                                                          ? 'bg-red-100 text-red-800'
                                                          : r.status === 'processing'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {r.status === 'completed'
                                                    ? 'Готово'
                                                    : r.status === 'failed'
                                                      ? 'Ошибка'
                                                      : r.status === 'processing'
                                                        ? 'Генерация…'
                                                        : 'Ожидание'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">
                                            {r.completedAt
                                                ? new Date(r.completedAt).toLocaleDateString('ru')
                                                : new Date(r.createdAt).toLocaleDateString('ru')}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {r.status === 'completed' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(r.id)}
                                                    className="inline-flex h-8 items-center rounded bg-blue-600 px-3 text-sm text-white hover:bg-blue-700"
                                                >
                                                    Скачать
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
