import { supabase } from './supabaseClient';
import { DEFAULT_EXPENSE_CATEGORIES, RESERVED_SLUGS } from '@/utils/constants';

export const bankService = {
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  },

  async getBySlug(slug) {
    const { data, error } = await supabase.rpc('get_bank_by_slug', { p_slug: slug });
    if (error) throw error;
    return data?.[0] || null;
  },

  async getRootBank() {
    const { data, error } = await supabase.rpc('get_root_bank');
    if (error) throw error;
    return data?.[0] || null;
  },

  async create(bankData, userId) {
    const slug = this.generateSlug(bankData.name);
    if (RESERVED_SLUGS.includes(slug)) {
      throw new Error(`The name "${bankData.name}" generates a reserved URL. Please choose a different name.`);
    }

    // Step 1: Create bank — don't use .select() yet (SELECT RLS requires bank_members)
    const { data: bankRows, error: bankError } = await supabase
      .from('banks')
      .insert({
        name: bankData.name,
        slug,
        currency: bankData.currency,
        owner_id: userId,
      })
      .select();
    // If .select() fails due to RLS, try without it
    let bank;
    if (bankError) {
      // Retry without .select() — INSERT may have succeeded
      const { error: bankError2 } = await supabase
        .from('banks')
        .insert({
          name: bankData.name,
          slug,
          currency: bankData.currency,
          owner_id: userId,
        });
      if (bankError2) throw bankError2;
      // Fetch the bank we just created
      const { data: fetched, error: fetchError } = await supabase
        .from('banks')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (fetchError) throw fetchError;
      bank = fetched;
    } else {
      bank = bankRows[0];
    }

    // Step 2: Create bank_members record for owner — must happen before other inserts
    const { error: memberError } = await supabase
      .from('bank_members')
      .insert({
        bank_id: bank.id,
        user_id: userId,
        role: 'owner',
      });
    if (memberError) throw memberError;

    // Step 3: Create hand_cash_accounts default record
    const { error: handCashError } = await supabase
      .from('hand_cash_accounts')
      .insert({
        bank_id: bank.id,
        balance: 0,
      });
    if (handCashError) throw handCashError;

    // Step 4: Seed default expense categories
    const categories = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      bank_id: bank.id,
      name,
    }));
    const { error: catError } = await supabase
      .from('expense_categories')
      .insert(categories);
    if (catError) throw catError;

    // Step 5: Seed default site_settings for landing page
    await supabase.from('site_settings').insert({
      bank_id: bank.id,
      site_name: bankData.name,
      tagline: 'Your Trusted Banking Partner',
      primary_color: '#1a56db',
      secondary_color: '#7c3aed',
      footer_text: `© ${new Date().getFullYear()} ${bankData.name}. All rights reserved.`,
    });

    // Step 6: Seed default landing sections
    const defaultSections = [
      { section_key: 'hero', title: 'Your Trusted Banking Partner', subtitle: 'Empowering communities through accessible and reliable agent banking services.', sort_order: 0, content: { cta_text: 'Contact Us', cta_link: '#contact' } },
      { section_key: 'about', title: 'About Us', subtitle: 'Building trust through reliable banking services', sort_order: 1, content: { description: 'We are committed to providing exceptional banking services to empower local communities. Our agent banking solutions bridge the gap between traditional banking and underserved populations.' } },
      { section_key: 'services', title: 'Our Services', subtitle: 'Comprehensive banking solutions for your needs', sort_order: 2 },
      { section_key: 'stats', title: 'Our Impact', sort_order: 3, content: { items: [{ label: 'Customers Served', value: 1000 }, { label: 'Transactions', value: 5000 }, { label: 'Years of Service', value: 3 }, { label: 'Agents', value: 10 }] } },
      { section_key: 'testimonials', title: 'What Our Customers Say', subtitle: 'Hear from the people we serve', sort_order: 4 },
      { section_key: 'faq', title: 'Frequently Asked Questions', subtitle: 'Find answers to common questions', sort_order: 5 },
      { section_key: 'cta', title: 'Ready to Get Started?', subtitle: 'Join us today and experience modern banking services.', sort_order: 6 },
    ].map((s) => ({ bank_id: bank.id, is_active: true, ...s }));

    await supabase.from('landing_sections').insert(defaultSections);

    return bank;
  },

  async getByOwner(userId) {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('owner_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getByMember(userId) {
    const { data: membership, error: memError } = await supabase
      .from('bank_members')
      .select('bank_id, role, banks(*)')
      .eq('user_id', userId)
      .single();
    if (memError && memError.code !== 'PGRST116') throw memError;
    if (!membership) return null;
    return { ...membership.banks, userRole: membership.role };
  },

  async update(bankId, updates) {
    const { data, error } = await supabase
      .from('banks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', bankId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getExpenseCategories(bankId) {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('bank_id', bankId)
      .order('name');
    if (error) throw error;
    return data;
  },

  async addExpenseCategory(bankId, name) {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ bank_id: bankId, name })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteExpenseCategory(categoryId) {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', categoryId);
    if (error) throw error;
  },
};
