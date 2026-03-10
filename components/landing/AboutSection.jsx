export function AboutSection({ title, subtitle, content, imageUrl, primaryColor }) {
  const bodyText = typeof content === 'object' ? content?.body : content;

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {title || 'About Us'}
            </h2>
            {subtitle && (
              <p className="text-lg text-gray-500 mb-6">{subtitle}</p>
            )}
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {bodyText || 'We are dedicated to providing excellent agent banking services to our community. With years of experience and a commitment to transparency, we ensure your banking needs are met with professionalism and care.'}
            </p>
          </div>

          {/* Image */}
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title || 'About'}
                className="rounded-2xl shadow-xl w-full h-auto object-cover"
              />
            ) : (
              <div
                className="rounded-2xl h-80 flex items-center justify-center"
                style={{ backgroundColor: (primaryColor || '#1a56db') + '10' }}
              >
                <span className="text-6xl">🏦</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
