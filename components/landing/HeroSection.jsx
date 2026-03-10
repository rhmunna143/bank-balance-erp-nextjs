import Link from 'next/link';

export function HeroSection({ title, subtitle, backgroundImageUrl, ctaText, ctaLink, primaryColor }) {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      {backgroundImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          {title || 'Your Trusted Banking Partner'}
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
          {subtitle || 'Experience seamless agent banking services with modern technology and trusted support.'}
        </p>
        <Link
          href={ctaLink || '#contact'}
          className="inline-block px-8 py-3 rounded-lg text-white font-medium text-lg transition-transform hover:scale-105"
          style={{ backgroundColor: primaryColor || '#1a56db' }}
        >
          {ctaText || 'Contact Us'}
        </Link>
      </div>
    </section>
  );
}
