import { useState, useEffect } from 'react';
import { useMotherAccounts } from './useMotherAccounts';
import { useHandCash } from './useHandCash';
import { useProfitAccounts } from './useProfitAccounts';

export function useAlerts() {
  const { accounts: motherAccounts } = useMotherAccounts();
  const { handCash } = useHandCash();
  const { accounts: profitAccounts } = useProfitAccounts();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = [];

    motherAccounts.forEach((account) => {
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

    if (handCash && handCash.low_threshold && parseFloat(handCash.balance) < parseFloat(handCash.low_threshold)) {
      newAlerts.push({
        id: 'hand-cash',
        type: 'hand_cash',
        accountName: 'Hand Cash',
        balance: handCash.balance,
        threshold: handCash.low_threshold,
        message: `Hand Cash balance (${handCash.balance}) is below threshold (${handCash.low_threshold})`,
      });
    }

    profitAccounts.forEach((account) => {
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
  }, [motherAccounts, handCash, profitAccounts]);

  return { alerts, hasAlerts: alerts.length > 0 };
}
