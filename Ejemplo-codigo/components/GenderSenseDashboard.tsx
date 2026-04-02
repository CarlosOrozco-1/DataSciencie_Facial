"use client";

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  User, 
  UserRound, 
  Activity, 
  BarChart3, 
  RefreshCcw, 
  Play, 
  Pause,
  ArrowUpRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { WebcamDetection } from '@/components/WebcamDetection';
import { Separator } from '@/components/ui/separator';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartConfig 
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export default function GenderSenseDashboard() {
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [isDetecting, setIsDetecting] = useState(true);
  const [sessionStartTime] = useState(new Date());

  const totalCount = maleCount + femaleCount;
  
  const handleDetection = (gender: 'male' | 'female' | 'none_detected') => {
    if (gender === 'male') {
      setMaleCount(prev => prev + 1);
    } else if (gender === 'female') {
      setFemaleCount(prev => prev + 1);
    }
  };

  const resetCounts = () => {
    setMaleCount(0);
    setFemaleCount(0);
  };

  const chartData = useMemo(() => [
    { name: 'Hombres', value: maleCount, fill: 'hsl(var(--primary))' },
    { name: 'Mujeres', value: femaleCount, fill: 'hsl(var(--accent))' },
  ], [maleCount, femaleCount]);

  const barData = useMemo(() => [
    { name: 'Total Detectados', Hombres: maleCount, Mujeres: femaleCount },
  ], [maleCount, femaleCount]);

  const chartConfig = {
    male: { label: 'Hombres', color: 'hsl(var(--primary))' },
    female: { label: 'Mujeres', color: 'hsl(var(--accent))' },
  } satisfies ChartConfig;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            GenderSense
          </h1>
          <p className="text-muted-foreground">Panel de Análisis de Audiencia en Tiempo Real</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={isDetecting ? "destructive" : "default"} 
            className="gap-2"
            onClick={() => setIsDetecting(!isDetecting)}
          >
            {isDetecting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isDetecting ? "Detener Detección" : "Iniciar Detección"}
          </Button>
          <Button variant="outline" size="icon" onClick={resetCounts}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Camera Feed */}
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Transmisión en Vivo
              </h2>
            </div>
            <WebcamDetection onDetection={handleDetection} isDetecting={isDetecting} />
          </section>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              label="Hombres" 
              count={maleCount} 
              icon={<User className="w-6 h-6 text-primary" />} 
              colorClass="bg-primary/10"
            />
            <StatsCard 
              label="Mujeres" 
              count={femaleCount} 
              icon={<UserRound className="w-6 h-6 text-accent" />} 
              colorClass="bg-accent/10"
              accent
            />
            <StatsCard 
              label="Total" 
              count={totalCount} 
              icon={<Users className="w-6 h-6 text-muted-foreground" />} 
            />
          </div>
        </div>

        {/* Sidebar: Analytics Dashboard */}
        <div className="space-y-8">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-accent" />
                Distribución por Género
              </CardTitle>
              <CardDescription>Análisis porcentual de la sesión actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {totalCount > 0 ? (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                    <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Esperando detecciones...</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Masculino</span>
                  </div>
                  <span className="font-bold">{totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span>Femenino</span>
                  </div>
                  <span className="font-bold">{totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Rendimiento de Sesión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Tasa de Detección</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    {isDetecting ? "15.4" : "0.0"} <span className="text-xs font-normal text-muted-foreground">pers/min</span>
                  </p>
                </div>
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <ArrowUpRight className="w-5 h-5 text-green-500" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Iniciado hace</p>
                <p className="text-sm font-medium">
                  {Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60)} minutos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}