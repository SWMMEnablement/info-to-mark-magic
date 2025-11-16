import type { TocItem } from './markdownUtils';

interface XmlSitemapOptions {
  url: string;
  toc?: TocItem[];
  filename?: string;
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export const exportToXmlSitemap = ({
  url,
  toc = [],
  filename = 'sitemap.xml',
  priority = 0.8,
  changefreq = 'weekly'
}: XmlSitemapOptions) => {
  const lastmod = new Date().toISOString().split('T')[0];
  
  // Create XML sitemap structure
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add main URL
  xml += '  <url>\n';
  xml += `    <loc>${escapeXml(url)}</loc>\n`;
  xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += `    <changefreq>${changefreq}</changefreq>\n`;
  xml += `    <priority>${priority}</priority>\n`;
  xml += '  </url>\n';
  
  // Add TOC items as sub-pages if they exist
  if (toc.length > 0) {
    toc.forEach((item) => {
      const itemUrl = `${url}#${item.id}`;
      const itemPriority = Math.max(0.5, priority - (item.level - 1) * 0.1);
      
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(itemUrl)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n`;
      xml += `    <priority>${itemPriority.toFixed(1)}</priority>\n`;
      xml += '  </url>\n';
    });
  }
  
  xml += '</urlset>';
  
  // Create and download file
  const blob = new Blob([xml], { type: 'application/xml' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
};

const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};
