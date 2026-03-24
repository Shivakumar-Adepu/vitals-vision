import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QRCodePairingProps {
  compact?: boolean;
}

export function QRCodePairing({ compact = false }: QRCodePairingProps) {
  const [copied, setCopied] = useState(false);
  const cameraUrl = `${window.location.origin}/camera`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cameraUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="bg-white p-1.5 rounded-md shadow-sm">
          <QRCodeSVG
            value={cameraUrl}
            size={64}
            level="M"
            bgColor="#ffffff"
            fgColor="#1e293b"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            Scan to Connect Mobile
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{cameraUrl}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy} data-testid="button-copy-camera-url">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-formal flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Pair Mobile Camera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Scan this QR code with your mobile phone to connect it as a remote camera. The live feed will appear in the monitoring view with full AI skeleton overlay.
        </p>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-4 rounded-xl shadow-md">
            <QRCodeSVG
              value={cameraUrl}
              size={180}
              level="H"
              bgColor="#ffffff"
              fgColor="#1e293b"
              imageSettings={{
                src: '',
                height: 0,
                width: 0,
                excavate: false,
              }}
            />
          </div>

          <Badge variant="secondary" className="text-[10px]">
            <Smartphone className="h-3 w-3 mr-1" />
            Point your phone camera at the QR code
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 text-xs font-mono bg-muted/50 px-3 py-2 rounded-md truncate border border-border">
            {cameraUrl}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy-camera-link">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>1. Scan QR code or open the link on your mobile device</p>
          <p>2. Tap "Start Camera" to begin streaming</p>
          <p>3. The skeleton overlay will appear here with 33-keypoint tracking</p>
        </div>
      </CardContent>
    </Card>
  );
}
