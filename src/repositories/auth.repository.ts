import { getPool } from "../config/db";

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  is_email_verified: boolean;
  created_at: Date;
}

export const registerService = async (
  name: string,
  email: string,
  passwordHash: string,
  role: string,
  isEmailVerified: boolean,
  twoFactorEnabled: boolean
): Promise<RegisteredUser> => {
  const query = `
    INSERT INTO users (name, email, password, role, is_email_verified, two_factor_enabled)
    VALUES ($1, $2, $3. $4, $5, $6)
    RETURNING id, name, email, role, is_email_verified, created_at
  `;
  const values = [name.trim(), email.toLowerCase().trim(), passwordHash, role, isEmailVerified, twoFactorEnabled];

  try {
    const result = await getPool().query<RegisteredUser>(query, values);
    return result.rows[0];
  } catch (error: any) {
    // 23505 = PostgreSQL unique_violation
    if (error.code === "23505") {
      throw new Error("An account with this email already exists");
    }
    throw error;
  }
};

export const markEmailAsVerified = async (id: string) => {
  const query = `UPDATE user SET is_email_verified=TRUE WHERE id=$1`
  const values = [id]

  const result = await getPool().query(query, values);
  return result.rows[0];
};

interface User extends RegisteredUser {
  password: string,
  two_factor_enabled: string,
  token_version: string
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const query = `SELECT * FROM users WHERE email=$1`;
  const value = [email];
  const result = await getPool().query(query, value);
  if (result.rows[0] !== null) {
    return result.rows[0];
  }

  return null;
}