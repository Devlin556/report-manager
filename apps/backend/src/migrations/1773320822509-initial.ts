import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1773320822509 implements MigrationInterface {
    name = 'Initial1773320822509';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "format" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, "s3Key" character varying, "userId" character varying, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "reports"`);
    }
}
