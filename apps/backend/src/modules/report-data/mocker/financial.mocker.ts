import { faker } from '@faker-js/faker';

const REVENUE_CATEGORIES = [
    'Консультации',
    'Диагностика',
    'Анализы',
    'Процедуры',
    'Хирургия',
    'Стационар',
    'Аптека',
    'Другое',
];

const EXPENSE_CATEGORIES = [
    'Зарплата',
    'Медикаменты',
    'Оборудование',
    'Аренда',
    'Коммунальные',
    'Прочее',
];

export function mockFinancialData() {
    const months = Array.from({ length: 36 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (35 - i));
        const revenue = faker.number.int({ min: 120000, max: 550000 });
        const expenses = faker.number.int({ min: 60000, max: 220000 });
        return {
            month: d.toISOString().slice(0, 7),
            revenue,
            expenses,
            profit: revenue - expenses,
        };
    });

    const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
    const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%';

    const revenueByCategory = REVENUE_CATEGORIES.map((cat) => ({
        label: cat,
        value: faker.number.int({ min: 50000, max: 300000 }),
    }));

    const expensesByCategory = EXPENSE_CATEGORIES.map((cat) => ({
        label: cat,
        value: faker.number.int({ min: 20000, max: 150000 }),
    }));

    const quarterlyData = [
        {
            quarter: 'Q1',
            revenue: faker.number.int({ min: 400000, max: 600000 }),
            profit: faker.number.int({ min: 100000, max: 200000 }),
        },
        {
            quarter: 'Q2',
            revenue: faker.number.int({ min: 450000, max: 650000 }),
            profit: faker.number.int({ min: 120000, max: 220000 }),
        },
        {
            quarter: 'Q3',
            revenue: faker.number.int({ min: 420000, max: 620000 }),
            profit: faker.number.int({ min: 110000, max: 210000 }),
        },
        {
            quarter: 'Q4',
            revenue: faker.number.int({ min: 480000, max: 680000 }),
            profit: faker.number.int({ min: 130000, max: 230000 }),
        },
    ];

    return {
        period: { startDate: months[0]!.month, endDate: months[35]!.month },
        financialData: months,
        quarterlyData,
        summaryTables: [
            {
                totalRevenue,
                totalExpenses,
                netProfit,
                margin,
            },
        ],
        charts: {
            revenue: months.map((m) => ({ label: m.month, value: m.revenue })),
            expenses: months.map((m) => ({ label: m.month, value: m.expenses })),
            profit: months.map((m) => ({ label: m.month, value: m.profit })),
            revenueByCategory,
            expensesByCategory,
            profitByQuarter: quarterlyData.map((q) => ({ label: q.quarter, value: q.profit })),
        },
        title: 'Финансовый отчёт',
    };
}
