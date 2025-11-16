import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, FileText, Globe, List, FileDown, Save, Code } from 'lucide-react';
import { generateTableOfContents, addTocToMarkdown, type TocItem } from '@/utils/markdownUtils';
import { exportToPDF } from '@/utils/pdfExport';
import { exportToHTML } from '@/utils/htmlExport';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownEditor } from './MarkdownEditor';
import { BatchExport, type SavedScrape } from './BatchExport';
import { TemplateLibrary } from './TemplateLibrary';
import type { MarkdownTemplate } from '@/utils/markdownTemplates';

interface ScrapeStats {
  total: number;
  success: number;
  failed: number;
}

interface ProgressState {
  current: number;
  total: number;
  currentUrl: string;
}

export const ScraperForm = () => {
  const [url, setUrl] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSitemap, setUseSitemap] = useState(false);
  const [maxPages, setMaxPages] = useState(50);
  const [stats, setStats] = useState<ScrapeStats | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [addToc, setAddToc] = useState(true);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [savedScrapes, setSavedScrapes] = useState<SavedScrape[]>([]);
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
    setProgress(null);
    setToc([]);
    
    try {
      // Use streaming for sitemap mode
      if (useSitemap) {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-to-markdown`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, useSitemap, maxPages, stream: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to scrape website');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'start') {
                setProgress({ current: 0, total: data.total, currentUrl: '' });
              } else if (data.type === 'progress') {
                setProgress({
                  current: data.current,
                  total: data.total,
                  currentUrl: data.url
                });
              } else if (data.type === 'complete') {
                let finalMarkdown = data.markdown;
                
                // Generate and add TOC if enabled
                if (addToc) {
                  const tocItems = generateTableOfContents(finalMarkdown);
                  setToc(tocItems);
                  if (tocItems.length > 0) {
                    finalMarkdown = addTocToMarkdown(finalMarkdown, tocItems);
                  }
                }
                
                setMarkdown(finalMarkdown);
                setEditedMarkdown(finalMarkdown);
                setStats(data.stats);
                setProgress(null);
                
                toast({
                  title: "Success",
                  description: `Scraped ${data.stats.success} of ${data.stats.total} pages successfully`,
                });
              }
            }
          }
        }
      } else {
        // Non-streaming single page mode
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
        let finalMarkdown = data.markdown;
        
        // Generate and add TOC if enabled
        if (addToc) {
          const tocItems = generateTableOfContents(finalMarkdown);
          setToc(tocItems);
          if (tocItems.length > 0) {
            finalMarkdown = addTocToMarkdown(finalMarkdown, tocItems);
          }
        }
        
        setMarkdown(finalMarkdown);
        setEditedMarkdown(finalMarkdown);
        
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
    if (!editedMarkdown) return;

    const blob = new Blob([editedMarkdown], { type: 'text/markdown' });
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

  const handleDownloadPDF = async () => {
    if (!editedMarkdown) return;

    try {
      await exportToPDF({
        markdown: editedMarkdown,
        toc,
        filename: 'scraped-content.pdf'
      });

      toast({
        title: "Downloaded",
        description: "PDF file saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadHTML = () => {
    if (!editedMarkdown) return;

    try {
      exportToHTML({
        markdown: editedMarkdown,
        toc,
        filename: 'scraped-content.html',
        theme: 'light'
      });

      toast({
        title: "Downloaded",
        description: "HTML file saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate HTML",
        variant: "destructive",
      });
    }
  };

  const handleSaveToBatch = () => {
    if (!markdown || !url) return;

    const newScrape: SavedScrape = {
      id: Date.now().toString(),
      url,
      markdown: editedMarkdown,
      toc,
      timestamp: new Date(),
    };

    setSavedScrapes(prev => [...prev, newScrape]);

    toast({
      title: "Saved to Batch",
      description: "Scrape added to batch export queue",
    });
  };

  const handleRemoveScrape = (id: string) => {
    setSavedScrapes(prev => prev.filter(s => s.id !== id));
  };

  const handleClearBatch = () => {
    setSavedScrapes([]);
    toast({
      title: "Cleared",
      description: "All scrapes removed from batch",
    });
  };

  const handleApplyTemplate = (template: MarkdownTemplate) => {
    setEditedMarkdown(template.template);
    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied to your content`,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">{/* ... keep existing code */}

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
            <>
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

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <List className="h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <Label htmlFor="toc-mode" className="font-medium">
                      Generate Table of Contents
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically add navigation links
                    </p>
                  </div>
                </div>
                <Switch
                  id="toc-mode"
                  checked={addToc}
                  onCheckedChange={setAddToc}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
        </div>

        {progress && (
          <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Scraping Progress: {progress.current} / {progress.total}
              </span>
              <span className="text-muted-foreground">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
            {progress.currentUrl && (
              <p className="text-xs text-muted-foreground truncate">
                Current: {progress.currentUrl}
              </p>
            )}
          </div>
        )}

        {markdown && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Content Preview & Editor
                </label>
                {stats && (
                  <p className="text-xs text-muted-foreground">
                    Successfully scraped {stats.success} of {stats.total} pages
                    {stats.failed > 0 && ` (${stats.failed} failed)`}
                  </p>
                )}
                {toc.length > 0 && (
                  <p className="text-xs text-primary">
                    Table of contents with {toc.length} sections generated
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <TemplateLibrary onApplyTemplate={handleApplyTemplate} />
                <Button onClick={handleSaveToBatch} variant="secondary" size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save to Batch
                </Button>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download MD
                </Button>
                <Button onClick={handleDownloadHTML} variant="outline" size="sm">
                  <Code className="mr-2 h-4 w-4" />
                  Export HTML
                </Button>
                <Button onClick={handleDownloadPDF} variant="default" size="sm">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview Only</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="mt-4">
                <MarkdownEditor
                  initialContent={editedMarkdown}
                  onContentChange={setEditedMarkdown}
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <MarkdownPreview content={editedMarkdown} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Card>
    </div>

    <div className="lg:col-span-1">
      <BatchExport
        scrapes={savedScrapes}
        onRemove={handleRemoveScrape}
        onClear={handleClearBatch}
      />
    </div>
  </div>
</div>
  );
};
