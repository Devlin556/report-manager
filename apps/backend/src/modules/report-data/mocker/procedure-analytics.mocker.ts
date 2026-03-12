import { faker } from '@faker-js/faker';

const PROCEDURES = ['УЗИ', 'ЭКГ', 'Анализ крови', 'Рентген', 'МРТ', 'ФГДС', 'УЗИ сердца', 'КТ'];
const DEPARTMENTS = ['Терапия', 'Хирургия', 'Кардиология', 'Неврология', 'Ортопедия'];

export function mockProcedureAnalyticsData() {
    const count = faker.number.int({ min: 3500, max: 5500 });
    const procedures = Array.from({ length: count }, () => {
        const cost = faker.number.int({ min: 500, max: 5000 });
        const procCount = faker.number.int({ min: 1, max: 20 });
        const date = faker.date.recent({ days: 180 });
        return {
            name: faker.helpers.arrayElement(PROCEDURES),
            count: procCount,
            cost,
            doctor: faker.person.fullName(),
            department: faker.helpers.arrayElement(DEPARTMENTS),
            date: date.toISOString().slice(0, 10),
        };
    });

    const byDoctor = procedures.reduce(
        (acc, p) => {
            const key = p.doctor;
            if (!acc[key]) acc[key] = { count: 0, revenue: 0 };
            acc[key].count += p.count;
            acc[key].revenue += p.count * p.cost;
            return acc;
        },
        {} as Record<string, { count: number; revenue: number }>,
    );

    const byDepartment = procedures.reduce(
        (acc, p) => {
            const key = p.department;
            if (!acc[key]) acc[key] = { count: 0, revenue: 0 };
            acc[key].count += p.count;
            acc[key].revenue += p.count * p.cost;
            return acc;
        },
        {} as Record<string, { count: number; revenue: number }>,
    );

    const byProcedure = procedures.reduce(
        (acc, p) => {
            const key = p.name;
            if (!acc[key]) acc[key] = { count: 0, revenue: 0 };
            acc[key].count += p.count;
            acc[key].revenue += p.count * p.cost;
            return acc;
        },
        {} as Record<string, { count: number; revenue: number }>,
    );

    const byMonth = procedures.reduce(
        (acc, p) => {
            const month = (p as { date: string }).date.slice(0, 7);
            acc[month] = (acc[month] ?? 0) + p.count;
            return acc;
        },
        {} as Record<string, number>,
    );
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
    });
    const chartByMonth = months.map((m) => ({ label: m, value: byMonth[m] ?? 0 }));

    return {
        procedures,
        aggregations: Object.entries(byDoctor).map(([doctor, { count, revenue }]) => ({
            doctor,
            count,
            revenue,
        })),
        byDepartment: Object.entries(byDepartment).map(([department, { count, revenue }]) => ({
            department,
            count,
            revenue,
        })),
        chartData: Object.entries(byDoctor)
            .slice(0, 12)
            .map(([label, { count: value }]) => ({ label, value })),
        chartByProcedure: Object.entries(byProcedure)
            .slice(0, 8)
            .map(([label, { count: value }]) => ({ label, value })),
        chartByDepartment: Object.entries(byDepartment).map(([label, { count: value }]) => ({
            label,
            value,
        })),
        chartRevenueByDoctor: Object.entries(byDoctor)
            .slice(0, 10)
            .map(([label, { revenue: value }]) => ({ label, value })),
        chartRevenueByProcedure: Object.entries(byProcedure)
            .slice(0, 8)
            .map(([label, { revenue: value }]) => ({ label, value })),
        chartRevenueByDepartment: Object.entries(byDepartment).map(
            ([label, { revenue: value }]) => ({
                label,
                value,
            }),
        ),
        chartByMonth,
        chartCostByProcedure: Object.entries(byProcedure)
            .slice(0, 8)
            .map(([label, { revenue, count }]) => ({
                label,
                value: count > 0 ? Math.round(revenue / count) : 0,
            })),
    };
}
