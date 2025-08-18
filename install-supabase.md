# Database Configuration Guide

This project supports both **Turso** (LibSQL) and **Supabase** (PostgreSQL) as database providers.

## Database Provider Setup

### Environment Configuration

Set the database provider in your `.env` file:

```bash
# Choose 'turso' or 'supabase'
DATABASE_PROVIDER=turso
```

## Turso Setup (Default)

Turso is already configured and is the default provider.

**Required Environment Variables:**
```bash
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
TURSO_DISABLE_CACHE=1
```

## Supabase Setup

### 1. Install Required Dependencies

```bash
npm install postgres
```

### 2. Environment Variables

```bash
DATABASE_PROVIDER=supabase
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 3. Get Your Supabase Database URL

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** and replace `[YOUR-PASSWORD]` with your database password

### 4. Run Database Migrations

Since both providers use the same schema, you can use the existing Drizzle migrations:

```bash
npm run db:generate  # Generate migrations (if needed)
npm run db:migrate   # Apply migrations
```

## Switching Between Providers

1. Update `DATABASE_PROVIDER` in your `.env` file
2. Set the appropriate database connection variables
3. Restart your application

The application will automatically detect and use the specified provider.

## Development Notes

- **Turso**: Better for edge deployment, SQLite-compatible
- **Supabase**: Full PostgreSQL features, better for complex queries
- Both providers use the same Drizzle ORM schema
- Switch between providers without code changes