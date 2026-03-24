import { Header } from '@/components/dashboard/Header';
import { StatusCards } from '@/components/dashboard/StatusCards';
import { LiveCameraFeed } from '@/components/dashboard/LiveCameraFeed';
import { AlertLog } from '@/components/dashboard/AlertLog';
import { VitalsChart } from '@/components/dashboard/VitalsChart';
import { BedBoard } from '@/components/dashboard/BedBoard';
import { EmergencySOS } from '@/components/dashboard/EmergencySOS';
import { OnDutyPanel } from '@/components/dashboard/OnDutyPanel';
import { useMockAI, type AlertType } from '@/hooks/useMockAI';
import type { DetectionEvent } from '@/hooks/useAdvancedDetection';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodePairing } from '@/components/dashboard/QRCodePairing';
import { useCallback, useRef } from 'react';
import logoImg from '@assets/Gemini_Generated_Image_wnr3tqwnr3tqwnr3-removebg-preview_1771707106938.png';

const Index = () => {
  const {
    alerts,
    vitals,
    patientsMonitored,
    activeAlerts,
    systemHealth,
    currentStatus,
    addAlert,
    clearFallStatus,
  } = useMockAI();

  const advancedCooldownRef = useRef<Record<string, number>>({});

  const handleFallDetected = useCallback((confidence: number, bodyPosition: string) => {
    addAlert('fall', { confidence, bodyPosition });
    setTimeout(() => clearFallStatus(), 10000);
  }, [addAlert, clearFallStatus]);

  const handleStatusChange = useCallback((status: AlertType) => {
    if (status === 'fall') {
      addAlert('movement', { bodyPosition: 'lying' });
    }
  }, [addAlert]);

  const handleSeizureDetected = useCallback((confidence: number) => {
    addAlert('seizure', { confidence, detectionSource: 'cnn-lstm' });
    setTimeout(() => clearFallStatus(), 10000);
  }, [addAlert, clearFallStatus]);

  const handleStumbleDetected = useCallback((confidence: number) => {
    addAlert('stumble', { confidence, detectionSource: 'cnn-lstm' });
    setTimeout(() => clearFallStatus(), 8000);
  }, [addAlert, clearFallStatus]);

  const handleAdvancedEvent = useCallback((event: DetectionEvent) => {
    const now = Date.now();
    const cooldown = advancedCooldownRef.current[event.event] || 0;
    if (now < cooldown) return;

    advancedCooldownRef.current[event.event] = now + 15000;

    const alertTypeMap: Record<string, AlertType> = {
      'Respiratory Distress': 'respiratory-distress',
      'Patient Agitation': 'agitation',
      'Elopement Risk': 'elopement',
      'Staff Absence': 'staff-absence',
    };

    const mappedType = alertTypeMap[event.event];
    if (mappedType) {
      addAlert(mappedType, {
        confidence: event.confidence,
        detectionSource: event.detectionSource,
      });
    }
  }, [addAlert]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div />
          <EmergencySOS />
        </div>

        <section className="mb-6">
          <StatusCards
            patientsMonitored={patientsMonitored}
            activeAlerts={activeAlerts}
            systemHealth={systemHealth}
          />
        </section>

        <section className="mb-6">
          <BedBoard />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveCameraFeed 
              currentStatus={currentStatus} 
              onFallDetected={handleFallDetected}
              onStatusChange={handleStatusChange}
              onSeizureDetected={handleSeizureDetected}
              onStumbleDetected={handleStumbleDetected}
              onAdvancedEvent={handleAdvancedEvent}
            />
            
            <QRCodePairing />

            <div className="flex justify-center">
              <Link to="/camera" target="_blank">
                <Button variant="outline" size="sm" className="flex items-center gap-2" data-testid="link-camera-page">
                  <ExternalLink className="h-4 w-4" />
                  Open Camera Page
                </Button>
              </Link>
            </div>

            <VitalsChart vitals={vitals} currentStatus={currentStatus} />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <OnDutyPanel />
            <AlertLog alerts={alerts} />
          </div>
        </div>

        <footer className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logoImg} alt="Vitals-Vision AI" className="h-24 w-auto object-contain -my-4" />
          </div>
          <p className="text-xs text-muted-foreground font-formal">
            Non-invasive monitoring system for Golden Hour emergency response
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            MediaPipe AI Pose Detection • Real-time Fall Detection • Privacy-preserving skeleton mapping
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
