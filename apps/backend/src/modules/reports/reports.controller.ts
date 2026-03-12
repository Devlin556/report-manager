import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('types')
    getTypes() {
        return this.reportsService.getAvailableTypes();
    }

    @Post('generate')
    async generate(@Body() body: { type: string; format: string }) {
        const { type, format } = body;
        const reportId = await this.reportsService.startGeneration(type, format);
        return { reportId };
    }

    @Get(':id/status')
    async getStatus(@Param('id') id: string) {
        return this.reportsService.getStatus(id);
    }

    @Get(':id/download-url')
    async getDownloadUrl(@Param('id') id: string) {
        return this.reportsService.getDownloadUrl(id);
    }

    @Get()
    list() {
        return this.reportsService.listAll();
    }
}
