import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const configPath = path.join(__dirname, '../config', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8')) as {
  services: { database: { host: string; port: number; username: string; password: string; database: string } };
};
const { host, port, username, password, database } = config.services.database;

export default new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [path.join(__dirname, 'src', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'src', 'migrations', '*{.ts,.js}')],
});
