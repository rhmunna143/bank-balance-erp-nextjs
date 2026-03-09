"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function ProfitChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-[var(--color-text-muted)]">
        No profit data for the selected period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
        <Bar dataKey="cashIn" fill="var(--color-success)" name="Cash-In to Profit" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="var(--color-danger)" name="Expenses from Profit" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
