import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Copy, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const ScraperForm = () => {
  const [url, setUrl] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    setMarkdown('');

    try {
      const { data, error } = await supabase.functions.invoke('scrape-to-markdown', {
        body: { url }
      });

      if (error) throw error;

      if (data?.markdown) {
        setMarkdown(data.markdown);
        toast({
          title: "Success",
          description: "Content scraped successfully",
        });
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to scrape content",
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
      description: "Markdown file downloaded successfully",
    });
  };

  const handleCopy = async () => {
    if (!markdown) return;

    try {
      await navigator.clipboard.writeText(markdown);
      toast({
        title: "Copied",
        description: "Markdown copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Globe className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Web to Markdown</h1>
            </div>
            <p className="text-muted-foreground">
              Convert any webpage to clean markdown format
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="Enter URL (e.g., https://example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                className="flex-1"
              />
              <Button 
                onClick={handleScrape} 
                disabled={isLoading || !url}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  'Scrape'
                )}
              </Button>
            </div>

            {markdown && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button 
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>

                <Textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="font-mono text-sm min-h-[500px]"
                  placeholder="Markdown content will appear here..."
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
