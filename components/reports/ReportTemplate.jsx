"use client";

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatCurrency } from '@/utils/currency';
import { formatDate, formatDateTime } from '@/utils/dateHelpers';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, borderBottom: '1 solid #ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', borderBottom: '0.5 solid #eee', paddingVertical: 4 },
  headerRow: { flexDirection: 'row', borderBottom: '1 solid #333', paddingBottom: 4, marginBottom: 4, fontWeight: 'bold' },
  col: { flex: 1 },
  colRight: { flex: 1, textAlign: 'right' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  summaryCard: { width: '50%', padding: 8, marginBottom: 4 },
  summaryLabel: { fontSize: 8, color: '#888', marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center', borderTop: '0.5 solid #ddd', paddingTop: 8 },
});

export function ReportDocument({ bankName, dateFrom, dateTo, currencySymbol, data }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{bankName}</Text>
          <Text style={styles.subtitle}>Transaction Report</Text>
          <Text style={styles.subtitle}>
            {formatDate(dateFrom)} — {formatDate(dateTo)}
          </Text>
          <Text style={styles.subtitle}>Generated: {formatDateTime(new Date())}</Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Deposits</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.totalDeposits || 0, currencySymbol)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Withdrawals</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.totalWithdrawals || 0, currencySymbol)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.totalExpenses || 0, currencySymbol)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net Commission</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.totalCommissions || 0, currencySymbol)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Balance (Mother + Hand Cash)</Text>
              <Text style={styles.summaryValue}>{formatCurrency((data.totalMotherBalance || 0) + (data.handCashBalance || 0), currencySymbol)}</Text>
            </View>
          </View>
        </View>

        {/* Transactions Table */}
        {data.transactions && data.transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transactions ({data.transactions.length})</Text>
            <View style={styles.headerRow}>
              <Text style={styles.col}>Date</Text>
              <Text style={styles.col}>Type</Text>
              <Text style={styles.col}>Customer</Text>
              <Text style={styles.colRight}>Amount</Text>
              <Text style={styles.colRight}>Commission</Text>
            </View>
            {data.transactions.map((txn, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.col}>{formatDate(txn.created_at)}</Text>
                <Text style={styles.col}>{txn.type?.replace('_', ' ')}</Text>
                <Text style={styles.col}>{txn.customer_name || '—'}</Text>
                <Text style={styles.colRight}>{formatCurrency(txn.amount, currencySymbol)}</Text>
                <Text style={styles.colRight}>{formatCurrency(txn.commission || 0, currencySymbol)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expenses Table */}
        {data.expenses && data.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expenses ({data.expenses.length})</Text>
            <View style={styles.headerRow}>
              <Text style={styles.col}>Date</Text>
              <Text style={styles.col}>Category</Text>
              <Text style={styles.col}>Description</Text>
              <Text style={styles.colRight}>Amount</Text>
            </View>
            {data.expenses.map((exp, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.col}>{formatDate(exp.created_at)}</Text>
                <Text style={styles.col}>{exp.category_name || '—'}</Text>
                <Text style={styles.col}>{exp.description || '—'}</Text>
                <Text style={styles.colRight}>{formatCurrency(exp.amount, currencySymbol)}</Text>
              </View>
            ))}
            <View style={[styles.row, { borderTop: '1 solid #333', marginTop: 4, paddingTop: 4 }]}>
              <Text style={[styles.col, { fontWeight: 'bold' }]}></Text>
              <Text style={[styles.col, { fontWeight: 'bold' }]}></Text>
              <Text style={[styles.col, { fontWeight: 'bold', textAlign: 'right' }]}>Total Expense</Text>
              <Text style={[styles.colRight, { fontWeight: 'bold' }]}>{formatCurrency(data.totalExpenses || 0, currencySymbol)}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{bankName} — Confidential Report</Text>
        </View>
      </Page>
    </Document>
  );
}
