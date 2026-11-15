# Database SQL scripts

These files contain the project's versioned SQL Server schema, migrations and demo seed/fix scripts. They are not a backup of the current local or hosted database.

- Review each script and the target database before execution.
- System_Restaurant.sql is a master initialization/rebuild script, not an incremental migration for an existing database.
- Some fix/seed scripts are for local demo data only.
- Do not add .bak backups, connection credentials or exports containing real customer data to this public repository.
- Keep the current database backup privately and use the hosting provider's supported migration/restore procedure.

This branch adds frontend and SQL scripts only. The backend is not included, so this repository alone is not yet the complete deployable restaurant application.
