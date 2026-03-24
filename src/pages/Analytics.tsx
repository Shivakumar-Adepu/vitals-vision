import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AlertTriangle, Clock, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Alert } from '@shared/schema';
import logoImg from '@assets/Gemini_Generated_Image_wnr3tqwnr3tqwnr3-removebg-preview_1771707106938.png';

function processAlertData(alerts: Alert[]) {
  const typeCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, Record<string, number>> = {};
  let totalConfidence = 0;
  let resolvedCount = 0;
  let criticalCount = 0;

  alerts.forEach((alert) => {
    typeCounts[alert.alertType] = (typeCounts[alert.alertType] || 0) + 1;

    const date = new Date(alert.timestamp);
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dayCounts[dayKey]) dayCounts[dayKey] = {};
    dayCounts[dayKey][alert.alertType] = (dayCounts[dayKey][alert.alertType] || 0) + 1;

    totalConfidence += alert.confidenceScore;
    if (alert.status === 'Resolved') resolvedCount++;
    if (alert.isHighPriority) criticalCount++;
  });

  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    alerts: hourCounts[i] || 0,
  }));

  const allTypes = Object.keys(typeCounts);
  const trendData = Object.entries(dayCounts).map(([date, types]) => ({
    date,
    ...allTypes.reduce((acc, type) => ({ ...acc, [type]: types[type] || 0 }), {}),
  }));

  return {
    typeData,
    hourData,
    trendData,
    allTypes,
    stats: {
      total: alerts.length,
      avgConfidence: alerts.length ? (totalConfidence / alerts.length * 100).toFixed(1) : '0',
      resolved: resolvedCount,
      critical: criticalCount,
      pending: alerts.length - resolvedCount,
    },
  };
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899'];

export default function Analytics() {
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts?limit=500');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
  });

  const { typeData, hourData, trendData, allTypes, stats } = processAlertData(alerts);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold font-formal">Historical Analytics</h2>
            <p className="text-sm text-muted-foreground">Alert trends, patterns, and system performance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </div>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-bold" data-testid="text-total-alerts">{stats.total}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-destructive" />
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-bold text-destructive" data-testid="text-critical-alerts">{stats.critical}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Avg Confidence</p>
              </div>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-bold text-success" data-testid="text-avg-confidence">{stats.avgConfidence}%</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-warning" />
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-bold text-warning" data-testid="text-pending-alerts">{stats.pending}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Alert Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : typeData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No alerts recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Peak Alert Hours (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={hourData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="alerts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Alert Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : trendData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No trend data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {allTypes.map((type, i) => (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <footer className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logoImg} alt="Vitals-Vision AI" className="h-24 w-auto object-contain -my-4" />
          </div>
          <p className="text-xs text-muted-foreground font-formal">
            Analytics — Historical alert data and system performance metrics
          </p>
        </footer>
      </main>
    </div>
  );
}
