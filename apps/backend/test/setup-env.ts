process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db";
process.env.BETTER_AUTH_SECRET ??= "a".repeat(32);
process.env.BETTER_AUTH_URL ??= "http://localhost:3001";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.NODE_ENV ??= "test";
process.env.LOG_LEVEL ??= "silent";
