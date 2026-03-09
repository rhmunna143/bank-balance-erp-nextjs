import { useState, useCallback } from 'react';
import { reportService } from '@/services/reportService';
import { useBank } from './useBank';

export function useReports() {
  const { bankId } = useBank();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = useCallback(async (startDate, endDate, reportType = 'full') => {
    if (!bankId) return null;
    setLoading(true);
    try {
      const data = await reportService.generateReportData(bankId, startDate, endDate, reportType);
      setReportData(data);
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  return { reportData, loading, generateReport };
}
