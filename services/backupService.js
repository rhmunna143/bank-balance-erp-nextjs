import { supabase } from './supabaseClient';
import { saveAs } from 'file-saver';

export const backupService = {
  async createBackup(bankId, label, userId) {
    const { data, error } = await supabase.rpc('create_bank_backup', {
      p_bank_id: bankId,
      p_label: label,
      p_user_id: userId,
    });
    if (error) throw error;
    return data;
  },

  async getBackups(bankId) {
    const { data, error } = await supabase
      .from('bank_backups')
      .select('id, bank_id, label, created_by, created_at')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getBackupData(backupId) {
    const { data, error } = await supabase
      .from('bank_backups')
      .select('*')
      .eq('id', backupId)
      .single();
    if (error) throw error;
    return data;
  },

  async restoreBackup(backupId, bankId) {
    const { data, error } = await supabase.rpc('restore_bank_backup', {
      p_backup_id: backupId,
      p_bank_id: bankId,
    });
    if (error) throw error;
    return data;
  },

  async restoreFromFile(bankId, backupData) {
    // First, create a temporary backup in the DB, then restore from it
    const { data: inserted, error: insertErr } = await supabase
      .from('bank_backups')
      .insert({
        bank_id: bankId,
        label: `File restore - ${new Date().toLocaleString()}`,
        backup_data: backupData,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    try {
      const { data, error } = await supabase.rpc('restore_bank_backup', {
        p_backup_id: inserted.id,
        p_bank_id: bankId,
      });
      if (error) throw error;
      return data;
    } finally {
      // Clean up the temp backup record
      await supabase.from('bank_backups').delete().eq('id', inserted.id);
    }
  },

  async downloadBackup(backupId, bankName) {
    const backup = await this.getBackupData(backupId);
    const exportData = {
      version: 1,
      app: 'AgentBank ERP',
      exported_at: new Date().toISOString(),
      bank_name: bankName,
      label: backup.label,
      data: backup.backup_data,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const safeName = (bankName || 'bank').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    saveAs(blob, `${safeName}_backup_${dateStr}.json`);
  },

  async downloadCurrentSnapshot(bankId, bankName, userId) {
    // Create a fresh backup, download it, then fetch it
    const label = `Offline backup - ${new Date().toLocaleString()}`;
    const result = await this.createBackup(bankId, label, userId);
    const backupId = result.id;
    await this.downloadBackup(backupId, bankName);
  },

  parseBackupFile(fileContent) {
    const parsed = JSON.parse(fileContent);
    if (parsed.version && parsed.data) {
      // New format with envelope
      return parsed.data;
    }
    // Legacy: raw backup_data object
    if (parsed.bank && parsed.transactions) {
      return parsed;
    }
    throw new Error('Invalid backup file format');
  },

  async deleteBackup(backupId) {
    const { error } = await supabase
      .from('bank_backups')
      .delete()
      .eq('id', backupId);
    if (error) throw error;
  },

  async resetAllData(bankId) {
    const { data, error } = await supabase.rpc('reset_bank_data', {
      p_bank_id: bankId,
    });
    if (error) throw error;
    return data;
  },
};
