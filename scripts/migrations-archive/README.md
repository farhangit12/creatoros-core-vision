# Migration runner archive

Each script here was a one-off runner for a single migration in `drizzle/` — it reads one specific `.sql` file and applies it inside a `BEGIN`/`COMMIT` transaction, rolling back on any error. They were reviewed and approved individually before being run (see `CLAUDE.md`'s "Database Rules"), and each has already done its job against the live database.

They're kept here as a record of the actual migration-application pattern used throughout this project, not because they need to be run again. To apply the schema fresh against a new database, see the README's "Getting started" section instead.
