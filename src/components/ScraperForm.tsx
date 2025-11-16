import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Download, FileText, Globe } from 'lucide-react';

interface ScrapeStats {
  total: number;
  success: number;
  failed: number;
}

export const ScraperForm = () => {
  const [url, setUrl] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSitemap, setUseSitemap] = useState(false);
  const [maxPages, setMaxPages] = useState(50);
  const [stats, setStats] = useState<ScrapeStats | null>(null);
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to scrape",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStats(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-to-markdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, useSitemap, maxPages }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape website');
      }

      const data = await response.json();
      setMarkdown(data.markdown);
      
      if (data.stats) {
        setStats(data.stats);
        toast({
          title: "Success",
          description: `Scraped ${data.stats.success} of ${data.stats.total} pages successfully`,
        });
      } else {
        toast({
          title: "Success",
          description: "Website scraped successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to scrape website",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!markdown) return;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scraped-content.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Markdown file saved successfully",
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">RubyInfoScrapper</h1>
        </div>
        <p className="text-muted-foreground">Convert online help files to markdown format</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium text-foreground">
              Website URL
            </label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/help"
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleScrape} disabled={isLoading || !url}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  'Scrape'
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div className="space-y-0.5">
                <Label htmlFor="sitemap-mode" className="font-medium">
                  Crawl Entire Sitemap
                </Label>
                <p className="text-xs text-muted-foreground">
                  Scrape all pages listed in sitemap.xml
                </p>
              </div>
            </div>
            <Switch
              id="sitemap-mode"
              checked={useSitemap}
              onCheckedChange={setUseSitemap}
              disabled={isLoading}
            />
          </div>

          {useSitemap && (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <Label htmlFor="max-pages" className="text-sm font-medium">
                Max Pages to Scrape: {maxPages}
              </Label>
              <Input
                id="max-pages"
                type="number"
                min="1"
                max="100"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 50)}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {markdown && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Markdown Preview
                </label>
                {stats && (
                  <p className="text-xs text-muted-foreground">
                    Successfully scraped {stats.success} of {stats.total} pages
                    {stats.failed > 0 && ` (${stats.failed} failed)`}
                  </p>
                )}
              </div>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download MD
              </Button>
            </div>
            <Textarea
              value={markdown}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </div>
        )}
      </Card>
    </div>
  );
};
