import { useState, useEffect, useRef } from 'react';
import { useMotherAccounts } from './useMotherAccounts';
import { useHandCash } from './useHandCash';
import { useProfitAccounts } from './useProfitAccounts';

interface Alert {
  id: string;
  type: string;
  accountName: string;
  balance: any;
  threshold: any;
  message: string;
}

export function useAlerts(bankId: string) {
  const { accounts: motherAccounts } = useMotherAccounts(bankId);
  const { handCash } = useHandCash(bankId);
  const { accounts: profitAccounts } = useProfitAccounts(bankId);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Stable serialized keys — prevents infinite loop caused by new array/object
  // references being returned from SWR on every render cycle.
  const motherKey = JSON.stringify(motherAccounts);
  const handCashKey = JSON.stringify(handCash);
  const profitKey = JSON.stringify(profitAccounts);

  useEffect(() => {
    const newAlerts: Alert[] = [];

    (motherAccounts || []).forEach((account: any) => {
      if (account.low_threshold && parseFloat(account.balance) < parseFloat(account.low_threshold)) {
        newAlerts.push({
          id: `mother-${account.id}`,
          type: 'mother_account',
          accountName: account.name,
          balance: account.balance,
          threshold: account.low_threshold,
          message: `${account.name} balance (${account.balance}) is below threshold (${account.low_threshold})`,
        });
      }
    });

    if (handCash && (handCash as any).low_threshold && parseFloat((handCash as any).balance) < parseFloat((handCash as any).low_threshold)) {
      newAlerts.push({
        id: 'hand-cash',
        type: 'hand_cash',
        accountName: 'Hand Cash',
        balance: (handCash as any).balance,
        threshold: (handCash as any).low_threshold,
        message: `Hand Cash balance (${(handCash as any).balance}) is below threshold (${(handCash as any).low_threshold})`,
      });
    }

    (profitAccounts || []).forEach((account: any) => {
      if (account.low_threshold && parseFloat(account.balance) < parseFloat(account.low_threshold)) {
        newAlerts.push({
          id: `profit-${account.id}`,
          type: 'profit_account',
          accountName: account.name,
          balance: account.balance,
          threshold: account.low_threshold,
          message: `${account.name} balance (${account.balance}) is below threshold (${account.low_threshold})`,
        });
      }
    });

    setAlerts(newAlerts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motherKey, handCashKey, profitKey]);

  return { alerts, hasAlerts: alerts.length > 0 };
}
