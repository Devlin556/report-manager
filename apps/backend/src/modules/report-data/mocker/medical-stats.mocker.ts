import { faker } from '@faker-js/faker';

const DIAGNOSES = [
  'ОРВИ',
  'Гипертония',
  'Диабет 2 типа',
  'Грипп',
  'Бронхит',
  'Гастрит',
  'Остеохондроз',
  'Ангина',
  'Аллергия',
  'Цистит',
];

const PROCEDURES = [
  'УЗИ брюшной полости',
  'ЭКГ',
  'Анализ крови',
  'Рентген грудной клетки',
  'МРТ позвоночника',
  'ФГДС',
  'УЗИ сердца',
  'Биохимический анализ',
  'Общий анализ мочи',
  'КТ головного мозга',
];

export function mockMedicalStatsData() {
  const startDate = faker.date.past({ years: 1 });
  const days: Array<{ date: string; visits: number; procedures: number }> = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      visits: faker.number.int({ min: 15, max: 80 }),
      procedures: faker.number.int({ min: 25, max: 150 }),
    });
  }

  const byDiagnosis = DIAGNOSES.map((d) => ({
    label: d,
    value: faker.number.int({ min: 20, max: 120 }),
  }));

  const doctorCount = faker.number.int({ min: 25, max: 45 });
  const byDoctor = Array.from({ length: doctorCount }, () => ({
    label: faker.person.fullName(),
    value: faker.number.int({ min: 30, max: 200 }),
  }));

  const byProcedure = PROCEDURES.map((p) => ({
    label: p,
    value: faker.number.int({ min: 15, max: 95 }),
  }));

  const topProcedures = PROCEDURES.slice(0, 8).map((name) => ({
    name,
    count: faker.number.int({ min: 50, max: 300 }),
    revenue: faker.number.int({ min: 50000, max: 500000 }),
  }));

  const DEPARTMENTS = ['Терапия', 'Хирургия', 'Кардиология', 'Неврология', 'Ортопедия'];
  const departmentStats = DEPARTMENTS.map((dep) => ({
    department: dep,
    visits: faker.number.int({ min: 100, max: 400 }),
    procedures: faker.number.int({ min: 200, max: 800 }),
  }));

  const totalDiag = byDiagnosis.reduce((s, x) => s + x.value, 0);
  const topDiagnoses = byDiagnosis.slice(0, 5).map((d) => ({
    diagnosis: d.label,
    count: d.value,
    share: (totalDiag > 0 ? (d.value / totalDiag) * 100 : 0).toFixed(1) + '%',
  }));

  const weeklyVisits = Array.from({ length: 12 }, (_, i) => ({
    week: `Неделя ${i + 1}`,
    visits: faker.number.int({ min: 80, max: 200 }),
  }));

  return {
    period: { startDate, endDate: days[days.length - 1]!.date },
    clinicStats: days,
    topProcedures,
    departmentStats,
    topDiagnoses,
    weeklyVisits,
    charts: {
      visits: days.map((d) => ({ label: d.date, value: d.visits })),
      byDiagnosis,
      byDoctor,
      byProcedure,
      proceduresTrend: days.map((d) => ({ label: d.date, value: d.procedures })),
      weeklyVisits: weeklyVisits.map((w) => ({ label: w.week, value: w.visits })),
      byDepartment: departmentStats.map((d) => ({ label: d.department, value: d.visits })),
    },
    textBlocks: Array.from({ length: 25 }, () => faker.lorem.paragraph()),
    title: 'Медицинская статистика',
  };
}
