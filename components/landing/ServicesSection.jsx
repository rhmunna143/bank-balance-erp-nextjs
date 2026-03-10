import {
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Shield,
  Clock,
  Users,
  CreditCard,
  Landmark,
  PiggyBank,
  HandCoins,
  TrendingUp,
} from 'lucide-react';

const ICON_MAP = {
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Shield,
  Clock,
  Users,
  CreditCard,
  Landmark,
  PiggyBank,
  HandCoins,
  TrendingUp,
};

export function ServicesSection({ title, subtitle, services = [], primaryColor }) {
  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title || 'Our Services'}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.length > 0 ? (
            services.map((service) => {
              const IconComponent = ICON_MAP[service.icon_name] || Banknote;
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: (primaryColor || '#1a56db') + '15' }}
                  >
                    <IconComponent className="h-6 w-6" style={{ color: primaryColor || '#1a56db' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </div>
              );
            })
          ) : (
            // Default services
            <>
              {[
                { icon: 'Wallet', title: 'Deposits', desc: 'Safe and secure deposit services with instant confirmation.' },
                { icon: 'ArrowUpFromLine', title: 'Withdrawals', desc: 'Quick and easy withdrawal services at your convenience.' },
                { icon: 'Banknote', title: 'Cash In', desc: 'Convenient cash-in services from multiple sources.' },
                { icon: 'CreditCard', title: 'Bill Payments', desc: 'Pay your utility bills and other dues hassle-free.' },
                { icon: 'TrendingUp', title: 'Savings', desc: 'Grow your money with our competitive savings options.' },
                { icon: 'Shield', title: 'Secure Banking', desc: 'Bank with confidence using our secure platform.' },
              ].map((item, i) => {
                const IconComponent = ICON_MAP[item.icon] || Banknote;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: (primaryColor || '#1a56db') + '15' }}
                    >
                      <IconComponent className="h-6 w-6" style={{ color: primaryColor || '#1a56db' }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
