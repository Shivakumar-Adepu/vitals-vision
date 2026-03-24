import { useState, useEffect } from 'react';
import { Bell, Mail, Phone, Save, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationPrefs {
  email?: string;
  phoneNumber?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  alertTypes: string;
  minSeverity: string;
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email: '',
    phoneNumber: '',
    emailEnabled: true,
    smsEnabled: true,
    alertTypes: 'all',
    minSeverity: 'high',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notification-preferences')
      .then(res => {
        if (res.status === 401) throw new Error('Please sign in to manage notification preferences');
        if (!res.ok) throw new Error('Failed to load preferences');
        return res.json();
      })
      .then(data => {
        setPrefs({
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          emailEnabled: data.emailEnabled !== false,
          smsEnabled: data.smsEnabled !== false,
          alertTypes: data.alertTypes || 'all',
          minSeverity: data.minSeverity || 'high',
        });
        setError(null);
      })
      .catch((err) => { setError(err.message); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (res.status === 401) {
        setError('Please sign in to save notification preferences');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save preferences');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-formal flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alert Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Get notified via email and SMS when critical alerts are detected. Notifications are sent automatically when AI detects an event matching your preferences.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPrefs(p => ({ ...p, emailEnabled: !p.emailEnabled }))}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors flex-1",
                prefs.emailEnabled
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground"
              )}
              data-testid="button-toggle-email"
            >
              <Mail className="h-4 w-4" />
              Email {prefs.emailEnabled ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => setPrefs(p => ({ ...p, smsEnabled: !p.smsEnabled }))}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors flex-1",
                prefs.smsEnabled
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground"
              )}
              data-testid="button-toggle-sms"
            >
              <Phone className="h-4 w-4" />
              SMS {prefs.smsEnabled ? 'On' : 'Off'}
            </button>
          </div>

          {prefs.emailEnabled && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notification Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={prefs.email || ''}
                onChange={e => setPrefs(p => ({ ...p, email: e.target.value }))}
                className="text-sm"
                data-testid="input-notification-email"
              />
            </div>
          )}

          {prefs.smsEnabled && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone Number (with country code)</label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={prefs.phoneNumber || ''}
                onChange={e => setPrefs(p => ({ ...p, phoneNumber: e.target.value }))}
                className="text-sm"
                data-testid="input-notification-phone"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Minimum Severity</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high', 'critical'].map(level => (
                <button
                  key={level}
                  onClick={() => setPrefs(p => ({ ...p, minSeverity: level }))}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                    prefs.minSeverity === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                  data-testid={`button-severity-${level}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="gap-2"
            data-testid="button-save-notifications"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
          </Button>
          {saved && (
            <Badge variant="secondary" className="text-[10px] text-green-600">
              Preferences saved successfully
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
