import { Shield, Clock, Moon, Sun, LogOut, BarChart3, AlertTriangle, Home, Bluetooth, Users, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '@assets/Gemini_Generated_Image_wnr3tqwnr3tqwnr3-removebg-preview_1771707106938.png';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/staff', label: 'Staff', icon: UserCheck },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/wearables', label: 'Wearables', icon: Bluetooth },
  ];

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <img src={logoImg} alt="Vitals-Vision AI" className="h-32 w-auto object-contain -my-8" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-card animate-status-pulse" />
              </div>
              
            </div>

            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden lg:flex flex-col items-center">
            <p className="text-sm font-formal font-semibold text-foreground">
              DRK College of Engineering
            </p>
            <p className="text-xs text-muted-foreground">
              AI-Powered Non-Invasive Patient Monitoring
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5">
              <Shield className="h-3.5 w-3.5 text-success" />
              <span className="text-xs">Privacy-First</span>
            </Badge>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="font-medium font-formal text-xs">
                  {currentTime.toLocaleTimeString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                {user.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt={user.firstName || 'User'}
                    className="w-7 h-7 rounded-full ring-2 ring-primary/20"
                    data-testid="img-user-avatar"
                  />
                )}
                <span className="hidden sm:block text-xs font-medium max-w-[80px] truncate">
                  {user.firstName || 'User'}
                </span>
                <a href="/api/logout">
                  <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-logout">
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
