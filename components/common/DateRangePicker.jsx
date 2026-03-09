"use client";

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <div className="flex-1">
        <Label className="text-xs mb-1 block">From</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <div className="flex-1">
        <Label className="text-xs mb-1 block">To</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
    </div>
  );
}
