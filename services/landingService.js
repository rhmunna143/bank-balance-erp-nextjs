import { supabase } from './supabaseClient';

export const landingService = {
  // ---- Site Settings ----
  async getSettings(bankId) {
    const { data, error } = await supabase
      .from('site_settings').select('*').eq('bank_id', bankId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertSettings(bankId, settings) {
    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ bank_id: bankId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'bank_id' })
      .select().single();
    if (error) throw error;
    return data;
  },

  // ---- Sections ----
  async getSections(bankId) {
    const { data, error } = await supabase
      .from('landing_sections').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async upsertSection(bankId, sectionKey, updates) {
    const { data, error } = await supabase
      .from('landing_sections')
      .upsert({ bank_id: bankId, section_key: sectionKey, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'bank_id,section_key' })
      .select().single();
    if (error) throw error;
    return data;
  },

  // ---- Services ----
  async getServices(bankId) {
    const { data, error } = await supabase
      .from('landing_services').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async createService(service) {
    const { data, error } = await supabase
      .from('landing_services').insert(service).select().single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    const { data, error } = await supabase
      .from('landing_services').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    const { error } = await supabase.from('landing_services').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Testimonials ----
  async getTestimonials(bankId) {
    const { data, error } = await supabase
      .from('landing_testimonials').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async createTestimonial(testimonial) {
    const { data, error } = await supabase
      .from('landing_testimonials').insert(testimonial).select().single();
    if (error) throw error;
    return data;
  },

  async updateTestimonial(id, updates) {
    const { data, error } = await supabase
      .from('landing_testimonials').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteTestimonial(id) {
    const { error } = await supabase.from('landing_testimonials').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- FAQs ----
  async getFaqs(bankId) {
    const { data, error } = await supabase
      .from('landing_faqs').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async createFaq(faq) {
    const { data, error } = await supabase
      .from('landing_faqs').insert(faq).select().single();
    if (error) throw error;
    return data;
  },

  async updateFaq(id, updates) {
    const { data, error } = await supabase
      .from('landing_faqs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFaq(id) {
    const { error } = await supabase.from('landing_faqs').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Images ----
  async getImages(bankId) {
    const { data, error } = await supabase
      .from('landing_images').select('*').eq('bank_id', bankId).order('sort_order');
    if (error) throw error;
    return data;
  },

  async addImage(imageData) {
    const { data, error } = await supabase
      .from('landing_images').insert(imageData).select().single();
    if (error) throw error;
    return data;
  },

  async deleteImage(id) {
    const { error } = await supabase.from('landing_images').delete().eq('id', id);
    if (error) throw error;
  },
};
