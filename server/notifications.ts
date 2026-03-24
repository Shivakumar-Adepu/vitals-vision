import { storage } from "./storage";
import type { Alert, NotificationPreference } from "../shared/schema";

function getSeverityLevel(alert: Alert): string {
  if (alert.isHighPriority || alert.confidenceScore >= 0.9) return "critical";
  if (alert.confidenceScore >= 0.75) return "high";
  if (alert.confidenceScore >= 0.6) return "medium";
  return "low";
}

const severityOrder: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function shouldNotify(pref: NotificationPreference, alert: Alert): boolean {
  const alertSeverity = getSeverityLevel(alert);
  const minSeverity = pref.minSeverity || "high";

  if (severityOrder[alertSeverity] < severityOrder[minSeverity]) {
    return false;
  }

  if (pref.alertTypes && pref.alertTypes !== "all") {
    const allowedTypes = pref.alertTypes
      .split(",")
      .map((t) => t.trim().toLowerCase());
    if (!allowedTypes.includes(alert.alertType.toLowerCase())) {
      return false;
    }
  }

  return true;
}

async function sendEmailNotification(
  email: string,
  alert: Alert,
): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendgridApiKey) {
    console.log("[Notify] SendGrid API key not configured, skipping email");
    return false;
  }

  const severity = getSeverityLevel(alert);
  const subject = `[${severity.toUpperCase()}] Vitals-Vision Alert: ${alert.alertType}`;
  const timestamp = alert.timestamp
    ? new Date(alert.timestamp).toLocaleString()
    : new Date().toLocaleString();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${severity === "critical" ? "#dc2626" : severity === "high" ? "#ea580c" : "#2563eb"}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">⚠️ Vitals-Vision AI Alert</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Golden Hour Emergency Response System</p>
      </div>
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Alert Type:</td><td style="padding: 8px 0;">${alert.alertType}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Severity:</td><td style="padding: 8px 0;"><span style="background: ${severity === "critical" ? "#dc2626" : severity === "high" ? "#ea580c" : "#2563eb"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${severity.toUpperCase()}</span></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Confidence:</td><td style="padding: 8px 0;">${(alert.confidenceScore * 100).toFixed(0)}%</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Time:</td><td style="padding: 8px 0;">${timestamp}</td></tr>
          ${alert.roomNumber ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Room:</td><td style="padding: 8px 0;">${alert.roomNumber}</td></tr>` : ""}
          ${alert.patientId ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Patient:</td><td style="padding: 8px 0;">${alert.patientId}</td></tr>` : ""}
          ${alert.detectionSource ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Source:</td><td style="padding: 8px 0;">${alert.detectionSource}</td></tr>` : ""}
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="color: #64748b; font-size: 12px; margin: 0;">This is an automated alert from Vitals-Vision AI by DRK College of Engineering. Please respond immediately if this is a critical event.</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || "alerts@vitals-vision.ai",
          name: "Vitals-Vision AI",
        },
        subject,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(
        `[Notify] Email sent to ${email} for alert ${alert.alertType}`,
      );
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[Notify] Email failed (${response.status}):`, errorText);
      return false;
    }
  } catch (error) {
    console.error("[Notify] Email error:", error);
    return false;
  }
}

async function sendSmsNotification(
  phoneNumber: string,
  alert: Alert,
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[Notify] Twilio credentials not configured, skipping SMS");
    return false;
  }

  const severity = getSeverityLevel(alert);
  const timestamp = alert.timestamp
    ? new Date(alert.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();
  const message = `[${severity.toUpperCase()}] Vitals-Vision AI: ${alert.alertType} detected${alert.roomNumber ? ` in ${alert.roomNumber}` : ""} at ${timestamp}. Confidence: ${(alert.confidenceScore * 100).toFixed(0)}%. Immediate response may be required.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: message,
      }).toString(),
    });

    if (response.ok) {
      console.log(
        `[Notify] SMS sent to ${phoneNumber} for alert ${alert.alertType}`,
      );
      return true;
    } else {
      const errorData = await response.json();
      console.error(`[Notify] SMS failed:`, errorData);
      return false;
    }
  } catch (error) {
    console.error("[Notify] SMS error:", error);
    return false;
  }
}

export async function notifyOnAlert(alert: Alert): Promise<void> {
  try {
    const allPrefs = await storage.getAllNotificationPreferences();

    for (const pref of allPrefs) {
      if (!shouldNotify(pref, alert)) continue;

      if (pref.emailEnabled && pref.email) {
        sendEmailNotification(pref.email, alert).catch(console.error);
      }

      if (pref.smsEnabled && pref.phoneNumber) {
        sendSmsNotification(pref.phoneNumber, alert).catch(console.error);
      }
    }
  } catch (error) {
    console.error("[Notify] Error processing notifications:", error);
  }
}
