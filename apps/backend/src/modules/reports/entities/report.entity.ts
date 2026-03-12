import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    type: string;

    @Column()
    format: string;

    @Column({ default: 'pending' })
    status: ReportStatus;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;

    @Column({ nullable: true })
    s3Key?: string;

    @Column({ nullable: true })
    userId?: string;
}
