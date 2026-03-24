import { Activity, TrendingUp, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { VitalData } from '@/hooks/useMockAI';
import { cn } from '@/lib/utils';

interface VitalsChartProps {
  vitals: VitalData[];
  currentStatus: string;
}

export function VitalsChart({ vitals, currentStatus }: VitalsChartProps) {
  const chartData = vitals.map((v, index) => ({
    time: index,
    respiratoryRate: Number(v.respiratoryRate.toFixed(1)),
    timestamp: v.timestamp.toLocaleTimeString(),
  }));

  const currentRate = vitals.length > 0 
    ? vitals[vitals.length - 1].respiratoryRate.toFixed(1) 
    : '0';

  const avgRate = vitals.length > 0
    ? (vitals.reduce((acc, v) => acc + v.respiratoryRate, 0) / vitals.length).toFixed(1)
    : '0';

  const isElevated = Number(currentRate) > 18;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-formal">
            <Wind className="h-5 w-5 text-primary" />
            Respiratory Rate Analysis
          </CardTitle>
          <Badge 
            variant={isElevated ? 'destructive' : 'secondary'}
            className="flex items-center gap-1"
          >
            <Activity className="h-3 w-3" />
            {isElevated ? 'Elevated' : 'Normal Range'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          AI-derived from micro-movement analysis (breaths/min)
        </p>
      </CardHeader>
      <CardContent>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className={cn(
              'text-2xl font-bold font-formal',
              isElevated ? 'text-destructive' : 'text-primary'
            )}>
              {currentRate}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold text-primary font-formal">{avgRate}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className={cn(
                'h-5 w-5',
                currentStatus === 'fall' ? 'text-destructive' : 'text-success'
              )} />
              <span className={cn(
                'text-sm font-medium',
                currentStatus === 'fall' ? 'text-destructive' : 'text-success'
              )}>
                {currentStatus === 'fall' ? 'Alert' : 'Stable'}
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                domain={[10, 25]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.timestamp;
                  }
                  return '';
                }}
                formatter={(value: number) => [`${value} breaths/min`, 'Respiratory Rate']}
              />
              {/* Normal range reference */}
              <ReferenceLine 
                y={12} 
                stroke="hsl(var(--success))" 
                strokeDasharray="5 5" 
                opacity={0.5}
              />
              <ReferenceLine 
                y={20} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5" 
                opacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="respiratoryRate"
                stroke={currentStatus === 'fall' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-success" />
            <span>Normal Low (12)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-warning" />
            <span>Normal High (20)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
