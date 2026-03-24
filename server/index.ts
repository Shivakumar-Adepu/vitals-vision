import express from 'express';
import { createServer } from 'http';
import { router } from './routes';
import { setupWebSocket } from './websocket';
import { setupVite, serveStatic } from './vite';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';
import { db } from './db';
import { alerts } from '../shared/schema';
import { sql } from 'drizzle-orm';

const app = express();
app.use(express.json());

const server = createServer(app);

setupWebSocket(server);

async function initDatabase() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        alert_type TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        confidence_score DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        is_high_priority BOOLEAN NOT NULL DEFAULT FALSE,
        patient_id TEXT,
        room_number TEXT,
        body_position TEXT,
        detection_source TEXT
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT,
        phone_number TEXT,
        email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        alert_types TEXT NOT NULL DEFAULT 'all',
        min_severity TEXT NOT NULL DEFAULT 'high',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS nurse_notes TEXT`);
    await db.execute(sql`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS responded_by TEXT`);
    await db.execute(sql`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        patient_code TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        room_number TEXT,
        bed_number TEXT,
        condition TEXT,
        doctor TEXT,
        admission_date TIMESTAMP DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'Stable',
        notes TEXT,
        blood_type TEXT,
        allergies TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        contact TEXT,
        shift TEXT NOT NULL DEFAULT 'Morning',
        is_on_duty BOOLEAN NOT NULL DEFAULT FALSE,
        department TEXT,
        avatar_initials TEXT,
        specialization TEXT
      )
    `);
    console.log('[DB] All tables ready (alerts, users, sessions, notification_preferences, patients, staff)');
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    process.exit(1);
  }
}

async function start() {
  await initDatabase();

  await setupAuth(app);
  registerAuthRoutes(app);

  app.use(router);

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(5000, '0.0.0.0', () => {
    console.log(`[Server] Vitals-Vision AI running on port 5000 (${isDev ? 'development' : 'production'})`);
    console.log('[Server] API: /api/alerts, /api/health');
    console.log('[Server] WebSocket: /ws');
  });
}

start();
