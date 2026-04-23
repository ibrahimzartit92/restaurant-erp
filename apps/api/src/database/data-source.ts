import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { InitialAuthAccessFoundation1730000000000 } from './migrations/1730000000000-initial-auth-access-foundation';
import { databaseEntities } from './typeorm-options';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: databaseEntities,
  migrations: [InitialAuthAccessFoundation1730000000000],
  synchronize: false,
});
