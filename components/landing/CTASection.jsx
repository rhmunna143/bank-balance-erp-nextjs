export function CTASection({ title, subtitle, primaryColor }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {title || 'Ready to Get Started?'}
        </h2>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          {subtitle || 'Join thousands of satisfied customers. Open your account today and experience modern agent banking.'}
        </p>
        <a
          href="#contact"
          className="inline-block px-8 py-3 rounded-lg text-white font-medium text-lg transition-transform hover:scale-105"
          style={{ backgroundColor: primaryColor || '#1a56db' }}
        >
          Contact Us
        </a>
      </div>
    </section>
  );
}
