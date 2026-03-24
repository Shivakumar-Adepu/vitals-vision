import { Header } from '@/components/dashboard/Header';
import { EmergencyAlertLog } from '@/components/dashboard/EmergencyAlertLog';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, Eye, Zap, HeartPulse, PersonStanding, Wind, ShieldAlert, Users } from 'lucide-react';
import logoImg from '@assets/Gemini_Generated_Image_wnr3tqwnr3tqwnr3-removebg-preview_1771707106938.png';

const detectionCapabilities = [
  { icon: PersonStanding, label: 'Fall Detection', color: 'text-red-500', desc: 'Sudden vertical changes & floor-level positioning' },
  { icon: HeartPulse, label: 'Respiratory Distress', color: 'text-blue-500', desc: 'Rapid/irregular chest wall movements' },
  { icon: Zap, label: 'Seizure Activity', color: 'text-purple-500', desc: 'Rhythmic high-frequency limb movements' },
  { icon: Wind, label: 'Stumble Detection', color: 'text-orange-500', desc: 'Loss of balance & gait irregularity' },
  { icon: ShieldAlert, label: 'Elopement Risk', color: 'text-red-600', desc: 'Patient leaving bed or restricted zone' },
  { icon: Brain, label: 'Patient Agitation', color: 'text-amber-500', desc: 'Repetitive thrashing or self-harm risk' },
  { icon: Users, label: 'Staff Absence', color: 'text-gray-500', desc: 'Duration since last caregiver visible' },
  { icon: Eye, label: 'Person Detection', color: 'text-indigo-500', desc: 'COCO-SSD real-time person counting' },
];

const AlertLogPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold font-formal">High-Priority Monitoring Interface</h2>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Shield className="h-3 w-3 text-success" />
              Privacy Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Dedicated monitoring interface optimized for mobile devices and CCTV integrations. 
            AI-driven visual analysis detects critical events in real-time and documents them automatically.
          </p>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">AI Detection Capabilities</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {detectionCapabilities.map(cap => (
              <div key={cap.label} className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                <cap.icon className={`h-4 w-4 shrink-0 mt-0.5 ${cap.color}`} />
                <div>
                  <p className="text-xs font-medium leading-tight">{cap.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <EmergencyAlertLog />

        <div className="mt-6">
          <NotificationSettings />
        </div>

        <footer className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logoImg} alt="Vitals-Vision AI" className="h-24 w-auto object-contain -my-4" />
          </div>
          <p className="text-xs text-muted-foreground font-formal">
            Real-Time Emergency Alert Monitoring • Golden Hour Response System
          </p>
        </footer>
      </main>
    </div>
  );
};

export default AlertLogPage;
