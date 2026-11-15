CREATE TABLE IF NOT EXISTS users(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT DEFAULT NULL,
    token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0),
    password VARCHAR(900) NOT NULL,
    reset_password VARCHAR(900) DEFAULT NULL,
    reset_password_expires_in TIMESTAMPTZ DEFAULT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'USER' CHECK(role IN ('USER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);