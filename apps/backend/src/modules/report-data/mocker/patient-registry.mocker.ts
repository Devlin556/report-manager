import { faker } from '@faker-js/faker';

const DIAGNOSES = [
  'ОРВИ',
  'Гипертония',
  'Диабет',
  'Грипп',
  'Бронхит',
  'Гастрит',
  'Остеохондроз',
  'Ангина',
  'Аллергия',
  'Цистит',
];

export function mockPatientRegistryData() {
  const count = faker.number.int({ min: 5000, max: 8000 });
  const patients = Array.from({ length: count }, () => ({
    lastName: faker.person.lastName(),
    firstName: faker.person.firstName(),
    birthDate: faker.date.birthdate().toISOString().slice(0, 10),
    diagnosis: faker.helpers.arrayElement(DIAGNOSES),
    visitDate: faker.date.recent({ days: 90 }).toISOString().slice(0, 10),
    doctor: faker.person.fullName(),
  }));

  const byDiagnosis = patients.reduce(
    (acc, p) => {
      acc[p.diagnosis] = (acc[p.diagnosis] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byDoctor = patients.reduce(
    (acc, p) => {
      acc[p.doctor] = (acc[p.doctor] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byMonth = patients.reduce(
    (acc, p) => {
      const month = p.visitDate.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = patients.length;
  const byDiagnosisTable = Object.entries(byDiagnosis).map(([diagnosis, count]) => ({
    diagnosis,
    count,
    percentage: ((count / total) * 100).toFixed(1) + '%',
  }));

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });

  return {
    patients,
    byDiagnosis: byDiagnosisTable,
    metadata: {
      period: 'Q1 2024',
      clinicName: 'Клиника Здоровья',
      totalPatients: total,
      reportDate: new Date().toISOString().slice(0, 10),
    },
    summary: {
      total,
      uniqueDiagnoses: Object.keys(byDiagnosis).length,
    },
    chartByDiagnosis: Object.entries(byDiagnosis)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value })),
    chartByDoctor: Object.entries(byDoctor)
      .slice(0, 12)
      .map(([label, value]) => ({ label, value })),
    chartByMonth: months.map((m) => ({ label: m, value: byMonth[m] ?? 0 })),
    chartByWeek: Array.from({ length: 8 }, (_, i) => ({
      label: `Неделя ${i + 1}`,
      value: faker.number.int({ min: 30, max: 120 }),
    })),
    chartAgeGroups: [
      { label: '0-18', value: faker.number.int({ min: 50, max: 150 }) },
      { label: '19-35', value: faker.number.int({ min: 80, max: 200 }) },
      { label: '36-50', value: faker.number.int({ min: 70, max: 180 }) },
      { label: '51-65', value: faker.number.int({ min: 60, max: 160 }) },
      { label: '65+', value: faker.number.int({ min: 40, max: 120 }) },
    ],
    chartTopDoctors: Object.entries(byDoctor)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
  };
}
