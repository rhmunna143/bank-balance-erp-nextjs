"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export function FAQSection({ title, subtitle, faqs = [], primaryColor }) {
  const displayFaqs = faqs.length > 0
    ? faqs
    : [
        { id: '1', question: 'How do I open an account?', answer: 'Visit our nearest agent point with your national ID and a passport-sized photo. Our agents will guide you through the simple registration process.' },
        { id: '2', question: 'What are the transaction limits?', answer: 'Daily transaction limits depend on your account type. Standard accounts have a daily limit of ৳25,000 for transactions.' },
        { id: '3', question: 'Is my money safe?', answer: 'Absolutely. All transactions are processed through secure banking channels with full regulatory compliance. Your deposits are protected.' },
        { id: '4', question: 'How can I check my balance?', answer: 'You can check your balance at any agent point or by using our online portal. Balance inquiries are free of charge.' },
        { id: '5', question: 'What are the service charges?', answer: 'Our service charges are minimal and transparent. Deposits are free, and withdrawal charges are clearly displayed at every agent point.' },
      ];

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title || 'Frequently Asked Questions'}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {displayFaqs.map((faq) => (
            <FAQItem key={faq.id} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
