import { Router, type Request, type Response } from 'express';
import { storage } from './storage';
import { insertAlertSchema, insertPatientSchema, insertStaffSchema } from '../shared/schema';
import { broadcastAlert, broadcastAlertResolved, broadcastToAll } from './websocket';
import { notifyOnAlert } from './notifications';

export const router = Router();

router.get('/api/alerts', async (_req: Request, res: Response) => {
  try {
    const limit = parseInt(String(_req.query.limit || '100'));
    const alertList = await storage.getAlerts(limit);
    res.json(alertList);
  } catch (error) {
    console.error('[API] Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.post('/api/alerts', async (req: Request, res: Response) => {
  try {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid alert data', details: parsed.error.flatten() });
      return;
    }
    const alert = await storage.createAlert(parsed.data);
    broadcastAlert(alert);
    notifyOnAlert(alert).catch(console.error);
    res.status(201).json(alert);
  } catch (error) {
    console.error('[API] Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

router.patch('/api/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }
    const { nurseNotes, respondedBy } = req.body || {};
    const alert = await storage.resolveAlert(id, nurseNotes, respondedBy);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    broadcastAlertResolved(id);
    res.json(alert);
  } catch (error) {
    console.error('[API] Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

router.post('/api/alerts/sos', async (req: Request, res: Response) => {
  try {
    const { roomNumber, triggeredBy } = req.body || {};
    const alert = await storage.createAlert({
      alertType: 'SOS',
      confidenceScore: 1.0,
      isHighPriority: true,
      status: 'Pending',
      patientId: null,
      roomNumber: roomNumber || 'All Rooms',
      bodyPosition: null,
      detectionSource: 'manual-sos',
      nurseNotes: triggeredBy ? `SOS triggered by ${triggeredBy}` : 'Manual SOS triggered',
    });
    broadcastAlert(alert);
    broadcastToAll({ type: 'sos_alert', alert, message: 'EMERGENCY SOS — All staff respond immediately' });
    notifyOnAlert(alert).catch(console.error);
    res.status(201).json(alert);
  } catch (error) {
    console.error('[API] Error triggering SOS:', error);
    res.status(500).json({ error: 'Failed to trigger SOS' });
  }
});

router.get('/api/patients', async (_req: Request, res: Response) => {
  try {
    const list = await storage.getPatients();
    res.json(list);
  } catch (error) {
    console.error('[API] Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

router.get('/api/patients/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const p = await storage.getPatientById(id);
    if (!p) { res.status(404).json({ error: 'Patient not found' }); return; }
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

router.post('/api/patients', async (req: Request, res: Response) => {
  try {
    const parsed = insertPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid patient data', details: parsed.error.flatten() });
      return;
    }
    const p = await storage.createPatient(parsed.data);
    res.status(201).json(p);
  } catch (error) {
    console.error('[API] Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

router.patch('/api/patients/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const p = await storage.updatePatient(id, req.body);
    if (!p) { res.status(404).json({ error: 'Patient not found' }); return; }
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

router.delete('/api/patients/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const ok = await storage.deletePatient(id);
    if (!ok) { res.status(404).json({ error: 'Patient not found' }); return; }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

router.get('/api/staff', async (_req: Request, res: Response) => {
  try {
    const list = await storage.getStaff();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.post('/api/staff', async (req: Request, res: Response) => {
  try {
    const parsed = insertStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid staff data', details: parsed.error.flatten() });
      return;
    }
    const s = await storage.createStaff(parsed.data);
    res.status(201).json(s);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

router.patch('/api/staff/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const s = await storage.updateStaff(id, req.body);
    if (!s) { res.status(404).json({ error: 'Staff not found' }); return; }
    res.json(s);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

router.delete('/api/staff/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const ok = await storage.deleteStaff(id);
    if (!ok) { res.status(404).json({ error: 'Staff not found' }); return; }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

router.patch('/api/staff/:id/duty', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isOnDuty } = req.body;
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const s = await storage.setStaffDuty(id, Boolean(isOnDuty));
    if (!s) { res.status(404).json({ error: 'Staff not found' }); return; }
    res.json(s);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update duty status' });
  }
});

router.get('/api/notification-preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }
    const prefs = await storage.getNotificationPreferences(userId);
    res.json(prefs || { emailEnabled: true, smsEnabled: true, alertTypes: 'all', minSeverity: 'high' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

const validSeverities = ['low', 'medium', 'high', 'critical'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

router.post('/api/notification-preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { email, phoneNumber, emailEnabled, smsEnabled, alertTypes, minSeverity } = req.body;
    const wantEmail = emailEnabled !== false;
    const wantSms = smsEnabled !== false;

    if (wantEmail && email && !emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email address format' }); return;
    }
    if (wantSms && phoneNumber && !phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ''))) {
      res.status(400).json({ error: 'Invalid phone number format.' }); return;
    }
    if (minSeverity && !validSeverities.includes(minSeverity)) {
      res.status(400).json({ error: 'Invalid severity level' }); return;
    }

    const pref = await storage.upsertNotificationPreferences({
      userId,
      email: wantEmail && email ? email.trim() : null,
      phoneNumber: wantSms && phoneNumber ? phoneNumber.trim() : null,
      emailEnabled: wantEmail,
      smsEnabled: wantSms,
      alertTypes: typeof alertTypes === 'string' ? alertTypes : 'all',
      minSeverity: minSeverity || 'high',
    });

    res.json(pref);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      websocket: 'active',
      mediapipe: 'client-side',
      cocoSsd: 'client-side',
      cnnLstm: 'client-side',
    },
  });
});
