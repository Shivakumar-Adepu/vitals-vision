import { Activity, Shield, Brain, Wifi, Eye, HeartPulse, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logoImg from '@assets/Gemini_Generated_Image_wnr3tqwnr3tqwnr3-removebg-preview_1771707106938.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <nav className="fixed top-0 w-full z-50 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Vitals-Vision AI" className="h-28 w-auto object-contain -my-6" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#tech" className="hover:text-foreground transition-colors">Technology</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login-nav">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </nav>

      <section className="pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                <Shield className="h-3.5 w-3.5" />
                Privacy-First Design
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-formal leading-tight text-foreground">
                AI-Powered <span className="text-primary">Patient Monitoring</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Non-invasive healthcare monitoring for Golden Hour emergency response. 
                Real-time fall detection, seizure recognition, and vital sign estimation — 
                all processed privately in the browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/api/login">
                  <Button size="lg" className="w-full sm:w-auto shadow-lg" data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> No video stored</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Skeleton-only processing</span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-400/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-muted-foreground">Dashboard Preview</span>
                </div>
                <div className="bg-gray-900 rounded-xl p-4 mb-4 aspect-video flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Activity className="h-8 w-8 text-green-400 mx-auto animate-pulse" />
                    <p className="text-green-400 text-xs font-mono">AI Monitoring Active</p>
                    <p className="text-gray-500 text-xs">33 Key Points Tracked</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">Normal</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Resp.</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">16/min</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Persons</p>
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400">1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-formal text-foreground mb-3">Intelligent Monitoring Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Multiple AI models work together to provide comprehensive patient safety monitoring
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">Fall Detection</h3>
                <p className="text-sm text-muted-foreground">
                  MediaPipe Pose extracts 33 body landmarks for multi-criteria fall scoring with 3-frame confirmation to eliminate false positives.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">Seizure Detection</h3>
                <p className="text-sm text-muted-foreground">
                  CNN-LSTM pattern recognition analyzes 60-frame temporal sequences to detect seizures and stumbles from movement patterns.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">Person Detection</h3>
                <p className="text-sm text-muted-foreground">
                  COCO-SSD (YOLO-equivalent) provides real-time person detection with bounding boxes using TensorFlow.js MobileNet v2.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HeartPulse className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">Respiratory Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  AI-derived respiratory rate estimation from micro-movement analysis with real-time charting and normal range indicators.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Wifi className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">Real-Time Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  WebSocket-powered instant alerts with audio notifications, device vibration, and persistent database logging.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">Privacy Shield</h3>
                <p className="text-sm text-muted-foreground">
                  All AI processing runs in-browser. No video data leaves the device — only skeleton overlays and alert metadata are used.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="tech" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold font-formal text-foreground mb-8">Built With Modern Technology</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['React 18', 'TypeScript', 'Express.js', 'PostgreSQL', 'WebSocket', 'MediaPipe', 'COCO-SSD', 'TensorFlow.js', 'Tailwind CSS', 'Drizzle ORM'].map((tech) => (
              <span key={tech} className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-sm font-medium shadow-sm border">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-16 px-4 border-t">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={logoImg} alt="Vitals-Vision AI" className="h-24 w-auto object-contain -my-4" />
          </div>
          <p className="text-sm text-muted-foreground font-formal">
            Developed by DRK College of Engineering
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Vitals-Vision AI — Non-invasive monitoring for Golden Hour emergency response
          </p>
        </div>
      </section>
    </div>
  );
}
