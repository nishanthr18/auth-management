import { getPool } from "../config/db";

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  is_email_verified: boolean;
  created_at: Date;
}

interface User extends RegisteredUser {
  password: string;
  two_factor_enabled: boolean;
  token_version: number;
  reset_password_token?: string | null;
  reset_password_expires_at?: Date | null;
}

export const registerService = async (
  name: string,
  email: string,
  passwordHash: string,
  role: "USER" | "ADMIN",
  isEmailVerified: boolean,
  twoFactorEnabled: boolean
): Promise<RegisteredUser> => {
  const query = `
    INSERT INTO users (
      name,
      email,
      password,
      role,
      is_email_verified,
      two_factor_enabled
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      name,
      email,
      role,
      is_email_verified,
      created_at
  `;

  const values = [
    name.trim(),
    email.toLowerCase().trim(),
    passwordHash,
    role,
    isEmailVerified,
    twoFactorEnabled,
  ];

  try {
    const result = await getPool().query<RegisteredUser>(
      query,
      values
    );

    return result.rows[0];
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error(
        "An account with this email already exists"
      );
    }

    throw error;
  }
};

export const markEmailAsVerified = async (id: string) => {
  const query = `
    UPDATE users
    SET is_email_verified = TRUE
    WHERE id = $1
    RETURNING *
  `;

  const values = [id];

  const result = await getPool().query(query, values);

  return result.rows[0];
};

export const findUserByEmail = async (
  email: string
): Promise<User | null> => {
  const query = `
    SELECT *
    FROM users
    WHERE email = $1
  `;

  const values = [email];

  const result = await getPool().query<User>(
    query,
    values
  );

  return result.rows.length > 0
    ? result.rows[0]
    : null;
};

export const findUserById = async (
  id: string
): Promise<User | null> => {
  const query = `
    SELECT *
    FROM users
    WHERE id = $1
  `;

  const values = [id];

  const result = await getPool().query<User>(
    query,
    values
  );

  return result.rows.length > 0
    ? result.rows[0]
    : null;
};

export const saveResetInitialPassword = async (
  id: string,
  resetPasswordToken: string,
  expiry: Date
) => {
  const query = `
    UPDATE users
    SET
      reset_password_token = $1,
      reset_password_expires_at = $2
    WHERE id = $3
    RETURNING
      reset_password_token,
      reset_password_expires_at
  `;

  const values = [
    resetPasswordToken,
    expiry,
    id,
  ];

  const result = await getPool().query(
    query,
    values
  );

  return result.rows[0];
};

export const findUserByResetToken = async (
  token: string
): Promise<User | null> => {
  const query = `
    SELECT *
    FROM users
    WHERE reset_password_token = $1
  `;

  const values = [token];

  const result = await getPool().query<User>(
    query,
    values
  );

  return result.rows.length > 0
    ? result.rows[0]
    : null;
};

export const updatePassword = async (
  id: string,
  password: string
) => {
  const query = `
    UPDATE users
    SET password = $1
    WHERE id = $2
    RETURNING id
  `;

  const values = [password, id];

  const result = await getPool().query(
    query,
    values
  );

  return result.rows[0];
};

export const clearResetToken = async (
  id: string
) => {
  const query = `
    UPDATE users
    SET
      reset_password_token = NULL,
      reset_password_expires_at = NULL
    WHERE id = $1
    RETURNING id
  `;

  const values = [id];

  const result = await getPool().query(
    query,
    values
  );

  return result.rows[0];
};

export const incrementTokenVersion = async (
  id: string
) => {
  const query = `
    UPDATE users
    SET token_version = token_version + 1
    WHERE id = $1
    RETURNING token_version
  `;

  const values = [id];

  const result = await getPool().query(
    query,
    values
  );

  return result.rows[0];
};
