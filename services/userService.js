import { supabase } from './supabaseClient';

export const userService = {
  async getMembers(bankId) {
    const { data: members, error } = await supabase
      .from('bank_members')
      .select('*')
      .eq('bank_id', bankId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    if (!members || members.length === 0) return [];

    // Fetch profiles for all member user_ids
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });

    return members.map((m) => ({ ...m, profiles: profileMap[m.user_id] || null }));
  },

  async inviteUser(bankId, email, role = 'operator') {
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: { full_name: email.split('@')[0] },
      },
    });

    if (authError) throw authError;

    if (authData.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: email.split('@')[0],
        });

      const { error: memberError } = await supabase
        .from('bank_members')
        .insert({
          bank_id: bankId,
          user_id: authData.user.id,
          role: role,
        });
      if (memberError) throw memberError;
    }

    return authData;
  },

  async removeMember(memberId) {
    const { error } = await supabase
      .from('bank_members')
      .delete()
      .eq('id', memberId);
    if (error) throw error;
  },

  async updateRole(memberId, role) {
    const { data, error } = await supabase
      .from('bank_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
