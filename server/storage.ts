import { db } from './db';
import {
  alerts, notificationPreferences, patients, staff,
  type Alert, type InsertAlert,
  type Patient, type InsertPatient,
  type Staff, type InsertStaff,
  type NotificationPreference, type InsertNotificationPreference,
} from '../shared/schema';
import { desc, eq } from 'drizzle-orm';

export interface IStorage {
  createAlert(data: InsertAlert): Promise<Alert>;
  getAlerts(limit?: number): Promise<Alert[]>;
  resolveAlert(id: number, notes?: string, respondedBy?: string): Promise<Alert | null>;
  getAlertById(id: number): Promise<Alert | null>;

  getPatients(): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | null>;
  createPatient(data: InsertPatient): Promise<Patient>;
  updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | null>;
  deletePatient(id: number): Promise<boolean>;

  getStaff(): Promise<Staff[]>;
  createStaff(data: InsertStaff): Promise<Staff>;
  updateStaff(id: number, data: Partial<InsertStaff>): Promise<Staff | null>;
  deleteStaff(id: number): Promise<boolean>;
  setStaffDuty(id: number, isOnDuty: boolean): Promise<Staff | null>;

  getNotificationPreferences(userId: string): Promise<NotificationPreference | null>;
  upsertNotificationPreferences(data: InsertNotificationPreference): Promise<NotificationPreference>;
  getAllNotificationPreferences(): Promise<NotificationPreference[]>;
}

export class DatabaseStorage implements IStorage {
  async createAlert(data: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(data).returning();
    return alert;
  }

  async getAlerts(limit = 100): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.timestamp)).limit(limit);
  }

  async resolveAlert(id: number, notes?: string, respondedBy?: string): Promise<Alert | null> {
    const updateData: any = {
      status: 'Resolved',
      respondedAt: new Date(),
    };
    if (notes) updateData.nurseNotes = notes;
    if (respondedBy) updateData.respondedBy = respondedBy;

    const [alert] = await db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning();
    return alert || null;
  }

  async getAlertById(id: number): Promise<Alert | null> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert || null;
  }

  async getPatients(): Promise<Patient[]> {
    return db.select().from(patients).orderBy(patients.roomNumber);
  }

  async getPatientById(id: number): Promise<Patient | null> {
    const [p] = await db.select().from(patients).where(eq(patients.id, id));
    return p || null;
  }

  async createPatient(data: InsertPatient): Promise<Patient> {
    const [p] = await db.insert(patients).values(data).returning();
    return p;
  }

  async updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | null> {
    const [p] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    return p || null;
  }

  async deletePatient(id: number): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id)).returning();
    return result.length > 0;
  }

  async getStaff(): Promise<Staff[]> {
    return db.select().from(staff).orderBy(staff.name);
  }

  async createStaff(data: InsertStaff): Promise<Staff> {
    const [s] = await db.insert(staff).values(data).returning();
    return s;
  }

  async updateStaff(id: number, data: Partial<InsertStaff>): Promise<Staff | null> {
    const [s] = await db.update(staff).set(data).where(eq(staff.id, id)).returning();
    return s || null;
  }

  async deleteStaff(id: number): Promise<boolean> {
    const result = await db.delete(staff).where(eq(staff.id, id)).returning();
    return result.length > 0;
  }

  async setStaffDuty(id: number, isOnDuty: boolean): Promise<Staff | null> {
    const [s] = await db.update(staff).set({ isOnDuty }).where(eq(staff.id, id)).returning();
    return s || null;
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const [pref] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return pref || null;
  }

  async upsertNotificationPreferences(data: InsertNotificationPreference): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(data.userId);
    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, data.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(notificationPreferences).values(data).returning();
    return created;
  }

  async getAllNotificationPreferences(): Promise<NotificationPreference[]> {
    return db.select().from(notificationPreferences);
  }
}

export const storage = new DatabaseStorage();
