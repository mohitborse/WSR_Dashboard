# WSR Dashboard and Release Planner

Angular 18 application backed by Supabase. The Release Planner provides a responsive monthly deployment calendar, environment/status/POD filters, selected-day details, summary counts, and release CRUD workflows.

## Prerequisites

- Node.js 22 or later
- npm
- A Supabase project, or the Supabase CLI and Docker for local development

## Application setup

1. Install dependencies:

	```bash
	npm install
	```

2. Set the Supabase project values in `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

	```ts
	export const environment = {
	  production: false,
	  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
	  supabaseAnonKey: 'YOUR_ANON_KEY',
	};
	```

3. Apply the migrations in `supabase/migrations` in filename order. With a linked Supabase CLI project:

	```bash
	npx supabase db push
	```

4. Optionally load development records from `supabase/seed.sql`. The seed does not create Auth users and is safe to run more than once.

5. Create a Supabase Auth user. The signup trigger creates its `profiles` row with the `VIEWER` role. Promote development users that need release editing access:

	```sql
	update public.profiles
	set role = 'ADMIN'
	where email = 'developer@example.com';
	```

6. Start the application:

	```bash
	npm start
	```

Open `http://localhost:4200/releases` after signing in. Release Planner is also available from the main application navigation.

## Release Planner architecture

- `release-planner.component` coordinates the feature and responsive layout.
- `release-calendar.component`, `release-sidebar.component`, and `release-form-modal.component` are standalone reusable UI components.
- `release.store.ts` owns releases, calendar selection, filters, modal state, loading, errors, notifications, and computed summaries using Angular Signals.
- `release.service.ts` is the Supabase CRUD boundary.
- `release.model.ts` contains the strict domain types and supported values.
- `supabase/migrations/0004_releases.sql` creates constraints, indexes, the `updated_at` trigger, and Row Level Security policies.

Authenticated users can read releases. Only users with an `ADMIN` or `MANAGER` profile can create, update, or delete releases.

## Supabase database backup

The PowerShell workflow creates role, schema, data, and migration-history dumps, verifies them, writes a SHA-256 manifest, and produces a timestamped ZIP under `backups/supabase`.

Set a direct or session-pooler Postgres URL. Percent-encode special characters in the database password:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres.PROJECT_REF:PASSWORD@HOST:5432/postgres'
npm run backup:supabase
```

Optional backup parameters can be passed directly:

```powershell
.\scripts\backup-supabase.ps1 -RetentionDays 14 -KeepUncompressed
```

Restore to a prepared Supabase project with PostgreSQL client tools installed:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres.TARGET_REF:PASSWORD@HOST:5432/postgres'
.\scripts\restore-supabase.ps1 -BackupPath '.\backups\supabase\supabase-YYYYMMDDTHHMMSSZ.zip' -RestoreMigrationHistory
```

Restore requires explicit `RESTORE` confirmation unless `-Force` is supplied. Database dumps do not include Storage object files, Edge Functions, project secrets, or Vault/pgsodium root encryption keys; those must be backed up separately through Supabase platform tooling.

## Verification

```bash
npm run build
npm test
```
# WSR_Dashboard
WSR Changes pushed.... updated..