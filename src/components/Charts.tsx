import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface RevenuePoint {
  month: string;
  revenue: number;
}

export function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a9822f" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a9822f" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#6b6459"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e8e3da' }}
          />
          <YAxis
            stroke="#6b6459"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={val => `₱${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any) => [formatCurrency(value), 'Revenue']}
            contentStyle={{
              backgroundColor: '#17140f',
              borderColor: '#2a2620',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#a9822f', fontSize: '12px', fontWeight: 600 }}
            itemStyle={{ color: '#a9822f', fontSize: '12px' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#a9822f"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#goldGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface EventTypePoint {
  name: string;
  value: number;
  color: string;
}

export function EventsDonutChart({ data }: { data: EventTypePoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="h-[280px] w-full flex flex-col items-center justify-center text-text-muted text-xs">
        <p>No event theme bookings recorded yet.</p>
      </div>
    );
  }

  const activeSlices = data.filter(d => d.value > 0);

  return (
    <div className="h-[280px] w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="75%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as EventTypePoint;
                return (
                  <div
                    style={{
                      backgroundColor: '#17140f',
                      borderColor: '#2a2620',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <p style={{ color: '#a9822f', fontSize: '12px', fontWeight: 600, margin: 0 }}>
                      {item.name}
                    </p>
                    <p style={{ color: '#a9822f', fontSize: '12px', margin: '2px 0 0 0' }}>
                      {item.value} {item.value === 1 ? 'booking' : 'bookings'}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Pie
            data={activeSlices}
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {activeSlices.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium mt-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5" style={{ color: '#a9822f' }}>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span>{item.name} ({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BarPoint {
  name: string;
  count: number;
  revenue: number;
}

const MAX_TICK_LINES = 3;
const TICK_LINE_CHARS = 12;

// Breaks a package name into short lines so full names fit under narrow bars.
function wrapLabel(label: string): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of label.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= TICK_LINE_CHARS || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > MAX_TICK_LINES) {
    const kept = lines.slice(0, MAX_TICK_LINES);
    kept[MAX_TICK_LINES - 1] = `${kept[MAX_TICK_LINES - 1]}…`;
    return kept;
  }
  return lines;
}

function PackageTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const lines = wrapLabel(payload?.value ?? '');
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#6b6459" fontSize={10}>
        {lines.map((line, i) => (
          <tspan key={i} x={0} dy={12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function BookingsBarChart({ data }: { data: BarPoint[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#6b6459"
            tick={<PackageTick />}
            height={48}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: '#e8e3da' }}
          />
          <YAxis
            stroke="#6b6459"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#17140f',
              borderColor: '#2a2620',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#a9822f', fontSize: '12px', fontWeight: 600 }}
            itemStyle={{ color: '#a9822f', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: '#a9822f', fontWeight: 500 }} />
          <Bar dataKey="count" name="Bookings" fill="#a9822f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
// --- Comparison chart -------------------------------------------------------

/** Two-series palette (validated: CVD ΔE ≥ 19, contrast ≥ 3:1 on the light surface). */
export const COMPARE_COLORS = ['#a9822f', '#3b6fb6'] as const;

interface CompareSeries {
  key: string;
  name: string;
}

/**
 * Grouped bars comparing two measures that share one unit (one y-axis only).
 * `format` sets how values read on the axis and tooltip.
 */
export function ComparisonBarChart({
  data,
  xKey,
  series,
  format = 'currency',
  height = 280,
}: {
  data: Record<string, any>[];
  xKey: string;
  series: [CompareSeries, CompareSeries];
  format?: 'currency' | 'percent' | 'count';
  height?: number;
}) {
  const fmt = (v: number) =>
    format === 'currency' ? formatCurrency(v) : format === 'percent' ? `${v.toFixed(1)}%` : String(v);
  const tick = (v: number) =>
    format === 'currency' ? `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}` : format === 'percent' ? `${v}%` : String(v);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -4, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="#6b6459"
            tick={xKey === 'name' ? <PackageTick /> : { fontSize: 11, fill: '#6b6459' }}
            height={xKey === 'name' ? 48 : 30}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: '#e8e3da' }}
          />
          <YAxis stroke="#6b6459" fontSize={11} tickLine={false} axisLine={false} tickFormatter={tick} width={56} />
          <Tooltip
            cursor={{ fill: 'rgba(169,130,47,0.08)' }}
            formatter={(value: any, name: any) => [fmt(Number(value)), name]}
            contentStyle={{ backgroundColor: '#17140f', borderColor: '#2a2620', borderRadius: '8px', padding: '8px 12px' }}
            labelStyle={{ color: '#f5efe3', fontSize: '12px', fontWeight: 600 }}
            itemStyle={{ color: '#f5efe3', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: '#3f3a32' }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={COMPARE_COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
