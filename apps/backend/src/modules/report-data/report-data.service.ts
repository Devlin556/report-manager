import { Injectable } from '@nestjs/common';
import { mockMedicalStatsData } from './mocker/medical-stats.mocker';
import { mockFinancialData } from './mocker/financial.mocker';
import { mockPatientRegistryData } from './mocker/patient-registry.mocker';
import { mockProcedureAnalyticsData } from './mocker/procedure-analytics.mocker';

const MOCKERS: Record<string, Record<string, () => unknown>> = {
    'medical-stats': { pdf: mockMedicalStatsData },
    financial: { pdf: mockFinancialData },
    'patient-registry': { xlsx: mockPatientRegistryData },
    'procedure-analytics': { xlsx: mockProcedureAnalyticsData },
};

@Injectable()
export class ReportDataService {
    getData(reportType: string, format: string): unknown {
        const mocker = MOCKERS[reportType]?.[format];
        if (!mocker) return null;
        return mocker();
    }
}
