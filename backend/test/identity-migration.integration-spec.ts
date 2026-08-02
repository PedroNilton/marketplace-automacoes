import { Pool, PoolClient } from 'pg';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SECOND_USER_ID = '00000000-0000-4000-8000-000000000002';
const SESSION_ID = '00000000-0000-4000-8000-000000000003';
const SECOND_SESSION_ID = '00000000-0000-4000-8000-000000000004';
const AUTH_TOKEN_ID = '00000000-0000-4000-8000-000000000005';
const SECOND_AUTH_TOKEN_ID = '00000000-0000-4000-8000-000000000006';

const INSERT_USER = `
  INSERT INTO users (
    id,
    display_name,
    email,
    password_hash,
    terms_version,
    privacy_version,
    legal_accepted_at
  ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
`;

async function withRollback(
  pool: Pool,
  action: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await action(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

describe('Initial identity migration', () => {
  let pool: Pool;

  beforeAll(() => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is required for migration integration tests',
      );
    }

    pool = new Pool({ connectionString });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates the planned tables and enums', async () => {
    const tables = await pool.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `);

    expect(tables.rows.map(({ tablename }) => tablename)).toEqual([
      'auth_rate_limits',
      'auth_tokens',
      'sessions',
      'users',
    ]);

    const enums = await pool.query<{ enum_name: string }>(`
      SELECT DISTINCT type.typname AS enum_name
      FROM pg_type AS type
      INNER JOIN pg_enum AS value ON value.enumtypid = type.oid
      WHERE type.typnamespace = 'public'::regnamespace
      ORDER BY type.typname
    `);

    expect(enums.rows.map(({ enum_name: enumName }) => enumName)).toEqual([
      'auth_rate_limit_action',
      'auth_token_purpose',
      'platform_role',
      'session_revoke_reason',
      'user_status',
    ]);
  });

  it('creates uniqueness, foreign keys, checks and partial indexes', async () => {
    const constraints = await pool.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
      ORDER BY conname
    `);

    expect(constraints.rows.map(({ conname }) => conname)).toEqual(
      expect.arrayContaining([
        'auth_rate_limits_attempt_count_nonnegative_check',
        'auth_tokens_user_id_fkey',
        'sessions_user_id_fkey',
      ]),
    );

    const indexes = await pool.query<{ indexname: string; indexdef: string }>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);
    const indexesByName = new Map(
      indexes.rows.map(({ indexname, indexdef }) => [indexname, indexdef]),
    );

    expect(indexesByName.get('users_email_key')).toContain('UNIQUE INDEX');
    expect(indexesByName.get('sessions_token_digest_key')).toContain(
      'UNIQUE INDEX',
    );
    expect(indexesByName.get('auth_tokens_token_digest_key')).toContain(
      'UNIQUE INDEX',
    );
    expect(indexesByName.get('sessions_active_user_id_idx')).toContain(
      'WHERE (revoked_at IS NULL)',
    );
    expect(indexesByName.get('auth_tokens_pending_user_purpose_idx')).toContain(
      'WHERE ((consumed_at IS NULL) AND (invalidated_at IS NULL))',
    );
  });

  it('applies account defaults and rejects duplicate normalized email', async () => {
    await withRollback(pool, async (client) => {
      const inserted = await client.query<{
        platform_role: string;
        status: string;
      }>(`${INSERT_USER} RETURNING status, platform_role`, [
        USER_ID,
        'Pessoa de Teste',
        'pessoa@example.com',
        'argon2id-test-hash',
        'terms-v1',
        'privacy-v1',
      ]);

      expect(inserted.rows).toEqual([
        { platform_role: 'MEMBER', status: 'ACTIVE' },
      ]);

      await expect(
        client.query(INSERT_USER, [
          SECOND_USER_ID,
          'Outra Pessoa',
          'pessoa@example.com',
          'another-argon2id-test-hash',
          'terms-v1',
          'privacy-v1',
        ]),
      ).rejects.toMatchObject({ code: '23505', constraint: 'users_email_key' });
    });
  });

  it('rejects duplicate session and authorization token digests', async () => {
    await withRollback(pool, async (client) => {
      await client.query(INSERT_USER, [
        USER_ID,
        'Pessoa de Teste',
        'pessoa@example.com',
        'argon2id-test-hash',
        'terms-v1',
        'privacy-v1',
      ]);

      const sessionDigest = 'a'.repeat(64);
      const csrfDigest = 'b'.repeat(64);
      const sessionValues = [SESSION_ID, USER_ID, sessionDigest, csrfDigest];
      const insertSession = `
        INSERT INTO sessions (
          id,
          user_id,
          token_digest,
          csrf_digest,
          idle_expires_at,
          absolute_expires_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '1 day')
      `;

      await client.query(insertSession, sessionValues);

      await expect(
        client.query(insertSession, [
          SECOND_SESSION_ID,
          USER_ID,
          sessionDigest,
          csrfDigest,
        ]),
      ).rejects.toMatchObject({
        code: '23505',
        constraint: 'sessions_token_digest_key',
      });
    });

    await withRollback(pool, async (client) => {
      await client.query(INSERT_USER, [
        USER_ID,
        'Pessoa de Teste',
        'pessoa@example.com',
        'argon2id-test-hash',
        'terms-v1',
        'privacy-v1',
      ]);

      const tokenDigest = 'c'.repeat(64);
      const insertToken = `
        INSERT INTO auth_tokens (
          id,
          user_id,
          purpose,
          token_digest,
          expires_at
        ) VALUES ($1, $2, 'EMAIL_VERIFICATION', $3, CURRENT_TIMESTAMP + INTERVAL '1 day')
      `;

      await client.query(insertToken, [AUTH_TOKEN_ID, USER_ID, tokenDigest]);

      await expect(
        client.query(insertToken, [SECOND_AUTH_TOKEN_ID, USER_ID, tokenDigest]),
      ).rejects.toMatchObject({
        code: '23505',
        constraint: 'auth_tokens_token_digest_key',
      });
    });
  });

  it('rejects orphan sessions and negative rate-limit counters', async () => {
    await withRollback(pool, async (client) => {
      await expect(
        client.query(
          `
            INSERT INTO sessions (
              id,
              user_id,
              token_digest,
              csrf_digest,
              idle_expires_at,
              absolute_expires_at
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '1 day')
          `,
          [SESSION_ID, USER_ID, 'd'.repeat(64), 'e'.repeat(64)],
        ),
      ).rejects.toMatchObject({
        code: '23503',
        constraint: 'sessions_user_id_fkey',
      });
    });

    await withRollback(pool, async (client) => {
      await expect(
        client.query(
          `
            INSERT INTO auth_rate_limits (
              action,
              key_digest,
              window_started_at,
              attempt_count
            ) VALUES ('LOGIN', $1, CURRENT_TIMESTAMP, -1)
          `,
          ['f'.repeat(64)],
        ),
      ).rejects.toMatchObject({
        code: '23514',
        constraint: 'auth_rate_limits_attempt_count_nonnegative_check',
      });
    });
  });
});
