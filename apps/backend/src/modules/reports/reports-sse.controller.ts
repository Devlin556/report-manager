import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { fromEvent } from 'rxjs';
import { take, takeUntil, tap } from 'rxjs/operators';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsSseController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Единый SSE-стрим: при подключении — список pending/processing, далее — обновления по всем отчётам */
  @Get('stream')
  async streamAll(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const processing = await this.reportsService.listProcessing();
    const initial = {
      reports: processing.map((r) => ({
        id: r.id,
        type: r.type,
        format: r.format,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        s3Key: r.s3Key,
      })),
    };
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    const close$ = fromEvent(res, 'close').pipe(take(1));
    this.reportsService
      .statusStreamAll()
      .pipe(
        tap((data) => res.write(`data: ${JSON.stringify(data)}\n\n`)),
        takeUntil(close$),
      )
      .subscribe({
        complete: () => res.end(),
      });
  }

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const current = await this.reportsService.getStatus(id);
    if (current) {
      res.write(`data: ${JSON.stringify(current)}\n\n`);
    }

    const close$ = fromEvent(res, 'close').pipe(take(1));
    this.reportsService
      .statusStream(id)
      .pipe(
        tap((data) => res.write(`data: ${JSON.stringify(data)}\n\n`)),
        takeUntil(close$),
      )
      .subscribe({
        complete: () => res.end(),
      });
  }
}
