import { pgTable, text, timestamp, doublePrecision, boolean, serial, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  alertType: text('alert_type').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  confidenceScore: doublePrecision('confidence_score').notNull(),
  status: text('status').notNull().default('Pending'),
  isHighPriority: boolean('is_high_priority').notNull().default(false),
  patientId: text('patient_id'),
  roomNumber: text('room_number'),
  bodyPosition: text('body_position'),
  detectionSource: text('detection_source'),
  nurseNotes: text('nurse_notes'),
  respondedBy: text('responded_by'),
  respondedAt: timestamp('responded_at'),
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  patientCode: text('patient_code').notNull(),
  name: text('name').notNull(),
  age: integer('age'),
  gender: text('gender'),
  roomNumber: text('room_number'),
  bedNumber: text('bed_number'),
  condition: text('condition'),
  doctor: text('doctor'),
  admissionDate: timestamp('admission_date').defaultNow(),
  status: text('status').notNull().default('Stable'),
  notes: text('notes'),
  bloodType: text('blood_type'),
  allergies: text('allergies'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
});

export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  contact: text('contact'),
  shift: text('shift').notNull().default('Morning'),
  isOnDuty: boolean('is_on_duty').notNull().default(false),
  department: text('department'),
  avatarInitials: text('avatar_initials'),
  specialization: text('specialization'),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email'),
  phoneNumber: text('phone_number'),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  smsEnabled: boolean('sms_enabled').notNull().default(true),
  alertTypes: text('alert_types').notNull().default('all'),
  minSeverity: text('min_severity').notNull().default('high'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
  respondedAt: true,
});

export const insertAlertSchemaRaw = createInsertSchema(alerts);

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  admissionDate: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });

export type InsertAlert = {
  alertType: string;
  confidenceScore: number;
  status?: string;
  isHighPriority?: boolean;
  patientId?: string | null;
  roomNumber?: string | null;
  bodyPosition?: string | null;
  detectionSource?: string | null;
  nurseNotes?: string | null;
  respondedBy?: string | null;
};
export type Alert = typeof alerts.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = {
  userId: string;
  email?: string | null;
  phoneNumber?: string | null;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  alertTypes?: string;
  minSeverity?: string;
};

export * from "./models/auth";
