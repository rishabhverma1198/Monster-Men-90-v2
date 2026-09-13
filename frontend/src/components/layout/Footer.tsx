/**
 * Footer Component
 * Matches Bewakoof.com style with About, Support, Social Media
 */

import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const FOOTER_LINKS = {
  about: [
    { name: 'About Us', href: '/about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Blog', href: '/blog' },
  ],
  support: [
    { name: 'Contact Us', href: '/contact' },
    { name: 'FAQs', href: '/faq' },
    { name: 'Shipping', href: '/shipping' },
    { name: 'Returns', href: '/returns' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Refund Policy', href: '/refund' },
  ],
};

const SOCIAL_LINKS = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-300">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary dark:bg-primary rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-900">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">MonsterMens90</span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors">
              Your one-stop destination for premium men's clothing. Quality, style, and comfort.
            </p>
            {/* Social Media */}
            <div className="flex space-x-4">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:border-primary transition-colors"
                    aria-label={social.name}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">About</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.about.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Customer Support</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Legal</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile App Banner */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">
                Download Our Mobile App
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                Get the best shopping experience on your mobile device
              </p>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-0">
              <a
                href="#"
                className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                Download for iOS
              </a>
              <a
                href="#"
                className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                Download for Android
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center transition-colors">
          <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
            © {new Date().getFullYear()} MonsterMens90. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
