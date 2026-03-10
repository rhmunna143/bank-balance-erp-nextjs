import { Mail, Phone, MapPin } from 'lucide-react';

export function FooterSection({ settings, bankName }) {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">
              {settings?.site_name || bankName || 'Agent Banking'}
            </h3>
            <p className="text-sm text-gray-400">
              {settings?.tagline || 'Your Trusted Banking Partner'}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Contact
            </h4>
            <div className="space-y-2 text-sm">
              {settings?.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{settings.contact_email}</span>
                </div>
              )}
              {settings?.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{settings.contact_phone}</span>
                </div>
              )}
              {settings?.contact_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{settings.contact_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Follow Us
            </h4>
            <div className="flex gap-3">
              {settings?.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Facebook
                </a>
              )}
              {settings?.twitter_url && (
                <a
                  href={settings.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Twitter
                </a>
              )}
              {settings?.linkedin_url && (
                <a
                  href={settings.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          {settings?.footer_text || `© ${year} ${bankName || 'Agent Banking'}. All rights reserved.`}
        </div>
      </div>
    </footer>
  );
}
