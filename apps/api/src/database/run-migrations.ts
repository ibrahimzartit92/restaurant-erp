import { AppDataSource } from './data-source';

async function runMigrations() {
  await AppDataSource.initialize();
  const pendingMigrations = await AppDataSource.showMigrations();
  console.log(
    pendingMigrations
      ? `Pending migrations found. Registered migrations: ${AppDataSource.migrations.length}.`
      : `No pending migrations. Registered migrations: ${AppDataSource.migrations.length}.`,
  );
  const executedMigrations = await AppDataSource.runMigrations();
  if (executedMigrations.length) {
    console.log(`Executed migrations: ${executedMigrations.map((migration) => migration.name).join(', ')}`);
  } else {
    console.log('No migrations executed.');
  }
  await AppDataSource.destroy();
}

runMigrations().catch((error) => {
  console.error(error);
  process.exit(1);
});
