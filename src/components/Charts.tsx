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
            data={data}
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
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

export function BookingsBarChart({ data }: { data: BarPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e3da" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#6b6459"
            fontSize={11}
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