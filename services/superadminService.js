import { supabase } from './supabaseClient';

export const superadminService = {
  async listAllBanks() {
    const { data, error } = await supabase.rpc('list_all_banks');
    if (error) throw error;
    return data || [];
  },

  async setRootBank(bankId) {
    const { data, error } = await supabase.rpc('set_root_bank', { p_bank_id: bankId });
    if (error) throw error;
    return data;
  },

  async getRootBank() {
    const { data, error } = await supabase.rpc('get_root_bank');
    if (error) throw error;
    return data?.[0] || null;
  },

  async toggleBankActive(bankId, isActive) {
    const { data, error } = await supabase.rpc('toggle_bank_active', {
      p_bank_id: bankId,
      p_is_active: isActive,
    });
    if (error) throw error;
    return data;
  },

  async getPlatformSettings() {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updatePlatformSettings(settings) {
    const { data, error } = await supabase.rpc('update_platform_settings', {
      p_platform_name: settings.platform_name || null,
    });
    if (error) throw error;
    return data;
  },
};
