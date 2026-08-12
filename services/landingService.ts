"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const landingService = {
  // ---- Site Settings ----
  async getSettings(bankId: string) {
    return null;
  },

  async upsertSettings(bankId: string, settings: any) {
    return null;
  },

  // ---- Sections ----
  async getSections(bankId: string) {
    return [];
  },

  async upsertSection(bankId: string, sectionKey: string, updates: any) {
    return null;
  },

  // ---- Services ----
  async getServices(bankId: string) {
    return [];
  },

  async createService(service: any) {
    return null;
  },

  async updateService(id: string, updates: any) {
    return null;
  },

  async deleteService(id: string) {
    return;
  },

  // ---- Testimonials ----
  async getTestimonials(bankId: string) {
    return [];
  },

  async createTestimonial(testimonial: any) {
    return null;
  },

  async updateTestimonial(id: string, updates: any) {
    return null;
  },

  async deleteTestimonial(id: string) {
    return;
  },

  // ---- FAQs ----
  async getFaqs(bankId: string) {
    return [];
  },

  async createFaq(faq: any) {
    return null;
  },

  async updateFaq(id: string, updates: any) {
    return null;
  },

  async deleteFaq(id: string) {
    return;
  },

  // ---- Images ----
  async getImages(bankId: string) {
    return [];
  },

  async addImage(imageData: any) {
    return null;
  },

  async deleteImage(id: string) {
    return;
  },
};
