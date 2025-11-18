import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PAGES = 50; // Limit to prevent abuse
const MAX_CUSTOM_URLS = 100; // Maximum URLs in custom list
const MAX_REQUESTS_PER_HOUR = 100; // Rate limit per IP

// In-memory rate limiting
const requestCounts = new Map<string, { count: number; hour: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hour = Math.floor(now / 3600000);
  const key = `${ip}:${hour}`;
  
  const existing = requestCounts.get(key);
  
  if (existing && existing.hour === hour) {
    if (existing.count >= MAX_REQUESTS_PER_HOUR) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return false;
    }
    existing.count++;
  } else {
    requestCounts.set(key, { count: 1, hour });
  }
  
  // Clean up old entries
  for (const [k, v] of requestCounts.entries()) {
    if (v.hour < hour - 1) {
      requestCounts.delete(k);
    }
  }
  
  return true;
}

interface SitemapUrl {
  loc: string;
  priority?: number;
}

// Security: Validate URLs to prevent SSRF attacks
function isPrivateOrLocalURL(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and private IP ranges
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\.0\.0\.0$/,
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fe80:/i, // IPv6 link-local
      /^fc00:/i, // IPv6 private
    ];
    
    return blockedPatterns.some(pattern => pattern.test(hostname));
  } catch {
    return true; // Block invalid URLs
  }
}

function validateInputs(url: string, maxPages: number, customUrls: string[] | null): { valid: boolean; error?: string } {
  // Validate main URL
  if (isPrivateOrLocalURL(url)) {
    return { valid: false, error: 'Cannot access private or local network addresses' };
  }
  
  // Validate maxPages
  if (maxPages < 1 || maxPages > MAX_PAGES) {
    return { valid: false, error: `maxPages must be between 1 and ${MAX_PAGES}` };
  }
  
  // Validate custom URLs if provided
  if (customUrls && Array.isArray(customUrls)) {
    if (customUrls.length > MAX_CUSTOM_URLS) {
      return { valid: false, error: `Cannot process more than ${MAX_CUSTOM_URLS} custom URLs` };
    }
    
    for (const customUrl of customUrls) {
      if (isPrivateOrLocalURL(customUrl)) {
        return { valid: false, error: `Cannot access private or local network addresses: ${customUrl}` };
      }
    }
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting and logging
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.error(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, useSitemap = false, maxPages = MAX_PAGES, stream = false, autoDiscoverLinks = false, customUrls = null } = await req.json();
    
    console.log(`[${new Date().toISOString()}] Scraping request from IP: ${clientIP}, URL: ${url}, maxPages: ${maxPages}`);

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs for security
    const validation = validateInputs(url, maxPages, customUrls);
    if (!validation.valid) {
      console.error(`[${new Date().toISOString()}] Input validation failed for IP: ${clientIP}, error: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching URL:', url, 'Use sitemap:', useSitemap, 'Auto-discover:', autoDiscoverLinks, 'Custom URLs:', customUrls?.length || 0, 'Stream:', stream);

    // If custom URLs provided with streaming
    if (customUrls && Array.isArray(customUrls) && customUrls.length > 0 && stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'start', 
            total: customUrls.length
          })}\n\n`));

          let combinedMarkdown = `# Scraped from ${url}\n\n`;
          let successCount = 0;

          for (let i = 0; i < customUrls.length; i++) {
            const pageUrl = customUrls[i];
            console.log(`Scraping custom URL ${i + 1}/${customUrls.length}: ${pageUrl}`);

            try {
              const result = await scrapeUrlToMarkdown(pageUrl);
              combinedMarkdown += `\n---\n\n## ${pageUrl}\n\n${result.markdown}\n\n`;
              successCount++;

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: customUrls.length,
                url: pageUrl,
                success: true
              })}\n\n`));
            } catch (error) {
              console.error(`Failed to scrape ${pageUrl}:`, error);
              combinedMarkdown += `\n---\n\n## ${pageUrl}\n\n*Failed to scrape this page*\n\n`;

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: customUrls.length,
                url: pageUrl,
                success: false
              })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            markdown: combinedMarkdown,
            stats: {
              total: customUrls.length,
              success: successCount,
              failed: customUrls.length - successCount
            }
          })}\n\n`));

          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // If preview mode (no stream), just return discovered URLs
    if ((useSitemap || autoDiscoverLinks) && !stream) {
      let urls: string[];
      let discoveryMethod: string;
      
      try {
        if (autoDiscoverLinks) {
          console.log('Discovering blog links from:', url);
          urls = await discoverBlogLinks(url, maxPages);
          discoveryMethod = urls.length > 0 ? 'Auto-discovery' : 'None';
        } else {
          urls = await fetchSitemapUrls(url, maxPages);
          discoveryMethod = 'Sitemap';
        }
        
        console.log(`Found ${urls.length} URLs via ${discoveryMethod}`);
        
        return new Response(
          JSON.stringify({ 
            urls, 
            discoveryMethod,
            total: urls.length 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error) {
        console.warn('Discovery failed:', error);
        return new Response(
          JSON.stringify({ 
            urls: [url], 
            discoveryMethod: 'Fallback (single URL)',
            total: 1,
            error: error instanceof Error ? error.message : 'Discovery failed'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // If auto-discover mode with streaming
    if (autoDiscoverLinks && stream) {
      let urls: string[];
      try {
        console.log('Discovering blog links from:', url);
        urls = await discoverBlogLinks(url, maxPages);
        console.log(`Found ${urls.length} blog links`);
      } catch (error) {
        console.warn('Link discovery failed, falling back to single URL:', error);
        urls = [url];
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'start', 
            total: urls.length,
            discoveryMode: true
          })}\n\n`));

          let combinedMarkdown = `# Blog Posts from ${url}\n\n`;
          let successCount = 0;

          for (let i = 0; i < urls.length; i++) {
            const pageUrl = urls[i];
            console.log(`Scraping blog post ${i + 1}/${urls.length}: ${pageUrl}`);

            try {
              const result = await scrapeUrlToMarkdown(pageUrl);
              combinedMarkdown += `\n---\n\n## ${pageUrl}\n\n${result.markdown}\n\n`;
              successCount++;

              // Send progress update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: urls.length,
                url: pageUrl,
                success: true
              })}\n\n`));
            } catch (error) {
              console.error(`Failed to scrape ${pageUrl}:`, error);
              combinedMarkdown += `\n---\n\n## ${pageUrl}\n\n*Failed to scrape this page*\n\n`;

              // Send failure update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: urls.length,
                url: pageUrl,
                success: false
              })}\n\n`));
            }
          }

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            markdown: combinedMarkdown,
            stats: {
              total: urls.length,
              success: successCount,
              failed: urls.length - successCount
            }
          })}\n\n`));

          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // If sitemap mode with streaming
    if (useSitemap && stream) {
      let urls: string[];
      try {
        urls = await fetchSitemapUrls(url, maxPages);
        console.log(`Found ${urls.length} URLs in sitemap`);
      } catch (error) {
        console.warn('Sitemap fetch failed, falling back to single URL:', error);
        urls = [url];
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'start', 
            total: urls.length 
          })}\n\n`));

          let combinedMarkdown = `# Scraped from ${url}\n\n`;
          let successCount = 0;

          for (let i = 0; i < urls.length; i++) {
            const pageUrl = urls[i];
            console.log(`Scraping page ${i + 1}/${urls.length}: ${pageUrl}`);

            try {
              const result = await scrapeUrlToMarkdown(pageUrl);
              combinedMarkdown += `\n---\n\n## Page: ${pageUrl}\n\n${result.markdown}\n\n`;
              successCount++;

              // Send progress update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: urls.length,
                url: pageUrl,
                success: true
              })}\n\n`));
            } catch (error) {
              console.error(`Failed to scrape ${pageUrl}:`, error);
              combinedMarkdown += `\n---\n\n## Page: ${pageUrl}\n\n*Failed to scrape this page*\n\n`;

              // Send failure update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: urls.length,
                url: pageUrl,
                success: false
              })}\n\n`));
            }
          }

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            markdown: combinedMarkdown,
            stats: {
              total: urls.length,
              success: successCount,
              failed: urls.length - successCount
            }
          })}\n\n`));

          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // If sitemap mode without streaming
    if (useSitemap) {
      let urls: string[];
      try {
        urls = await fetchSitemapUrls(url, maxPages);
        console.log(`Found ${urls.length} URLs in sitemap`);
      } catch (error) {
        console.warn('Sitemap fetch failed, falling back to single URL:', error);
        urls = [url];
      }

      let combinedMarkdown = `# Scraped from ${url}\n\n`;
      let successCount = 0;

      for (let i = 0; i < urls.length; i++) {
        const pageUrl = urls[i];
        console.log(`Scraping page ${i + 1}/${urls.length}: ${pageUrl}`);

        try {
          const result = await scrapeUrlToMarkdown(pageUrl);
          combinedMarkdown += `\n---\n\n## Page: ${pageUrl}\n\n${result.markdown}\n\n`;
          successCount++;
        } catch (error) {
          console.error(`Failed to scrape ${pageUrl}:`, error);
          combinedMarkdown += `\n---\n\n## Page: ${pageUrl}\n\n*Failed to scrape this page*\n\n`;
        }
      }

      console.log(`Successfully scraped ${successCount}/${urls.length} pages`);

      return new Response(
        JSON.stringify({ 
          markdown: combinedMarkdown,
          stats: {
            total: urls.length,
            success: successCount,
            failed: urls.length - successCount
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single page mode
    console.log('Scraping single page:', url);

    const result = await scrapeUrlToMarkdown(url);

    return new Response(
      JSON.stringify({ markdown: result.markdown, html: result.html }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-to-markdown:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchSitemapUrls(baseUrl: string, maxPages: number): Promise<string[]> {
  const parsedUrl = new URL(baseUrl);
  const sitemapUrl = `${parsedUrl.protocol}//${parsedUrl.host}/sitemap.xml`;
  
  console.log('[SITEMAP] Fetching sitemap from:', sitemapUrl);

  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/xml,text/xml,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8',
      },
    });

    console.log(`[SITEMAP] Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Sitemap not found at ${sitemapUrl} (${response.status} ${response.statusText})`);
    }

    const sitemapXml = await response.text();
    console.log(`[SITEMAP] Received XML length: ${sitemapXml.length} characters`);
    
    // Parse XML to extract URLs
    const urlMatches = sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g);
    const urls: string[] = [];
    
    for (const match of urlMatches) {
      if (urls.length >= maxPages) break;
      urls.push(match[1]);
    }

    console.log(`[SITEMAP] Extracted ${urls.length} URLs from sitemap`);

    if (urls.length === 0) {
      throw new Error('No URLs found in sitemap');
    }

    return urls;
  } catch (error) {
    console.error('[SITEMAP] Error fetching sitemap:', error);
    throw new Error(`Failed to fetch sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function discoverBlogLinks(baseUrl: string, maxLinks: number): Promise<string[]> {
  try {
    // First, try to find and use sitemap
    console.log('Attempting to discover links from sitemap first...');
    try {
      const sitemapUrls = await fetchSitemapUrls(baseUrl, maxLinks);
      
      // Filter sitemap URLs for blog/article patterns
      const blogUrls = sitemapUrls.filter(url => {
        const path = url.toLowerCase();
        return path.includes('/blog/') ||
          path.includes('/post/') ||
          path.includes('/article/') ||
          path.includes('/news/') ||
          path.includes('/articles/') ||
          path.includes('/posts/') ||
          path.match(/\/\d{4}\/\d{2}\//) || // Date-based URLs
          path.match(/\/\d{4}-\d{2}-\d{2}/); // Date URLs
      });
      
      if (blogUrls.length > 0) {
        console.log(`Found ${blogUrls.length} blog URLs from sitemap`);
        return blogUrls.slice(0, maxLinks);
      }
      
      console.log('No blog URLs found in sitemap, falling back to HTML parsing');
    } catch (sitemapError) {
      console.log('Sitemap not found or failed, falling back to HTML parsing:', sitemapError);
    }
    
    // Fall back to HTML link discovery
    console.log('[DISCOVER] Fetching base page for HTML parsing:', baseUrl);
    
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    console.log(`[DISCOVER] Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[DISCOVER] Received HTML length: ${html.length} characters`);
    const links = new Set<string>();
    
    // Extract all links from the HTML
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      
      // Skip if it's not a valid link
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      
      // Convert relative URLs to absolute
      let fullUrl: string;
      try {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          fullUrl = href;
        } else if (href.startsWith('//')) {
          fullUrl = new URL(baseUrl).protocol + href;
        } else if (href.startsWith('/')) {
          const base = new URL(baseUrl);
          fullUrl = `${base.protocol}//${base.host}${href}`;
        } else {
          const base = new URL(baseUrl);
          const basePath = base.pathname.endsWith('/') ? base.pathname : base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
          fullUrl = `${base.protocol}//${base.host}${basePath}${href}`;
        }
        
        const urlObj = new URL(fullUrl);
        
        // Only include links from the same domain
        if (urlObj.hostname !== new URL(baseUrl).hostname) {
          continue;
        }
        
        // Look for common blog/article patterns
        const path = urlObj.pathname.toLowerCase();
        const isBlogLink = 
          path.includes('/blog/') ||
          path.includes('/post/') ||
          path.includes('/article/') ||
          path.includes('/news/') ||
          path.includes('/articles/') ||
          path.includes('/posts/') ||
          path.match(/\/\d{4}\/\d{2}\//) || // Date-based URLs like /2024/01/
          path.match(/\/\d{4}-\d{2}-\d{2}/); // URLs with dates like /2024-01-15
        
        if (isBlogLink && fullUrl !== baseUrl) {
          links.add(fullUrl);
        }
      } catch (e) {
        // Skip invalid URLs
        continue;
      }
    }
    
    const urls = Array.from(links).slice(0, maxLinks);
    
    console.log(`[DISCOVER] Found ${urls.length} blog URLs from HTML parsing`);
    
    if (urls.length === 0) {
      console.warn('[DISCOVER] No blog links found on the page');
      throw new Error('No blog links found on the page');
    }
    
    return urls;
  } catch (error) {
    console.error('[DISCOVER] Error discovering blog links:', error);
    throw new Error(`Failed to discover blog links: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function scrapeUrlToMarkdown(url: string): Promise<{ markdown: string; html: string }> {
  console.log(`[SCRAPE] Starting scrape for: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  console.log(`[SCRAPE] Response status: ${response.status} ${response.statusText}`);
  console.log(`[SCRAPE] Content-Type: ${response.headers.get('content-type')}`);

  if (!response.ok) {
    const errorMsg = `Failed to fetch URL: ${response.status} ${response.statusText}`;
    console.error(`[SCRAPE] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const html = await response.text();
  const htmlLength = html.length;
  
  console.log(`[SCRAPE] Received HTML length: ${htmlLength} characters`);
  console.log(`[SCRAPE] HTML preview (first 500 chars): ${html.substring(0, 500)}`);
  
  // Log if HTML appears to be minimal (likely JavaScript-rendered)
  if (htmlLength < 5000) {
    console.warn(`[SCRAPE] WARNING: HTML is suspiciously short (${htmlLength} chars). This page may be JavaScript-rendered.`);
  }

  // Try to extract main content intelligently
  let contentHtml = html;
  
  // Look for common content container patterns
  const mainContentPatterns = [
    /<main[^>]*>(.*?)<\/main>/gis,
    /<article[^>]*>(.*?)<\/article>/gis,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gis,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gis,
    /<div[^>]*class="[^"]*main[^"]*"[^>]*>(.*?)<\/div>/gis,
    /<div[^>]*id="[^"]*main[^"]*"[^>]*>(.*?)<\/div>/gis,
  ];

  for (const pattern of mainContentPatterns) {
    const matches = html.match(pattern);
    if (matches && matches[0]) {
      console.log(`[SCRAPE] Found main content using pattern: ${pattern.source.substring(0, 50)}...`);
      contentHtml = matches[0];
      break;
    }
  }

  // If no main content found, log warning
  if (contentHtml === html) {
    console.warn(`[SCRAPE] Could not identify main content area, using full HTML`);
  }

  // Convert HTML to markdown with improved parsing
  let markdown = contentHtml
    // Remove script and style tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert section tags with aria-label or data-title attributes to headings
    .replace(/<section[^>]*(?:aria-label|data-title)=["']([^"']*)["'][^>]*>/gi, '\n## $1\n')
    .replace(/<section[^>]*>/gi, '\n')
    // Convert headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n\n')
    // Convert links
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Convert images
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)')
    .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)')
    // Convert code blocks
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n')
    // Convert bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Convert lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    // Convert blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n')
    // Convert div and section to spacing
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/section>/gi, '\n')
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // Convert line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Clean up whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const markdownLength = markdown.length;
  console.log(`[SCRAPE] Generated markdown length: ${markdownLength} characters`);
  console.log(`[SCRAPE] Markdown preview (first 500 chars): ${markdown.substring(0, 500)}`);
  
  // Warn if markdown is too short
  if (markdownLength < 100) {
    console.warn(`[SCRAPE] WARNING: Generated markdown is very short (${markdownLength} chars). Content extraction may have failed.`);
    console.warn(`[SCRAPE] This often happens with JavaScript-heavy sites that require browser rendering.`);
  }

  return { markdown, html: contentHtml };
}
