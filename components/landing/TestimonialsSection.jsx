import { Star } from 'lucide-react';

export function TestimonialsSection({ title, subtitle, testimonials = [], primaryColor }) {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title || 'What Our Customers Say'}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.length > 0 ? (
            testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-gray-50 rounded-xl p-6 border border-gray-100"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img
                      src={t.avatar_url}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: primaryColor || '#1a56db' }}
                    >
                      {t.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm text-gray-900">{t.name}</p>
                    {t.designation && (
                      <p className="text-xs text-gray-500">{t.designation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Default testimonials
            <>
              {[
                { name: 'Mohammad Ali', designation: 'Business Owner', quote: 'Excellent banking service with quick transactions and friendly staff.' },
                { name: 'Fatima Begum', designation: 'Teacher', quote: 'I feel safe banking here. The service is reliable and trustworthy.' },
                { name: 'Karim Uddin', designation: 'Farmer', quote: 'Now I can do banking right in my village. Very convenient!' },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 italic">&ldquo;{item.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: primaryColor || '#1a56db' }}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.designation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
