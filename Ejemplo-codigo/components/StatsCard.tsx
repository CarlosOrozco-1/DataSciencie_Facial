import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass?: string;
  accent?: boolean;
}

export function StatsCard({ label, count, icon, colorClass, accent }: StatsCardProps) {
  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      accent ? "border-accent/30 shadow-[0_0_15px_-5px_rgba(99,233,211,0.2)]" : "border-border",
      "hover:border-primary/50"
    )}>
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <h3 className="text-4xl font-bold tracking-tight">
            {count.toLocaleString()}
          </h3>
        </div>
        <div className={cn(
          "p-3 rounded-full bg-secondary",
          colorClass
        )}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}