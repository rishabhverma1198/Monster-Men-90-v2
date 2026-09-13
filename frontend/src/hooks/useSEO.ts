/**
 * Custom SEO Hook
 * Updates document title and meta tags dynamically
 * Alternative to react-helmet-async for React 19 compatibility
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export function useSEO({
  title,
  description,
  keywords,
  image,
  url,
}: SEOProps = {}) {
  useEffect(() => {
    // Update title
    if (title) {
      document.title = `${title} - MonsterMens90`;
    }

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      if (!content) return;

      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    // Update description
    if (description) {
      updateMetaTag('description', description);
      updateMetaTag('og:description', description, true);
      updateMetaTag('twitter:description', description, true);
    }

    // Update keywords
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }

    // Update Open Graph tags
    if (title) {
      updateMetaTag('og:title', `${title} - MonsterMens90`, true);
      updateMetaTag('twitter:title', `${title} - MonsterMens90`, true);
    }

    if (image) {
      updateMetaTag('og:image', image, true);
      updateMetaTag('twitter:image', image, true);
    }

    if (url) {
      updateMetaTag('og:url', url, true);
      updateMetaTag('twitter:url', url, true);
    }

    // Update canonical URL
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
    }

    // Cleanup function to reset title on unmount (optional)
    return () => {
      // You can reset to default title if needed
    };
  }, [title, description, keywords, image, url]);
}
