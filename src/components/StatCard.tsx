import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  meta?: string;
  icon: LucideIcon;
  tone?: 'gold' | 'green' | 'blue' | 'orange' | 'violet';
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = 'gold',
  trend = 'up',
}: StatCardProps) {
  const toneMap = {
    gold: 'bg-gold-light text-gold-dark',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-amber-50 text-amber-700',
    violet: 'bg-purple-50 text-purple-700',
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-muted">{label}</span>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="font-serif text-2xl font-bold tracking-tight text-ink">{value}</div>
          {meta && (
            <p className="mt-1 text-xs font-medium text-text-muted flex items-center gap-1">
              <span className={trend === 'up' ? 'text-emerald-600' : 'text-text-muted'}>
                {meta}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
