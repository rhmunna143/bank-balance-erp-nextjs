"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function BalanceTrendChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-[var(--color-text-muted)]">
        No data available for the selected period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="motherBalance"
          stroke="var(--color-primary)"
          name="Mother Accounts"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="handCash"
          stroke="var(--color-success)"
          name="Hand Cash"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="profitBalance"
          stroke="var(--color-accent)"
          name="Profit Accounts"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
