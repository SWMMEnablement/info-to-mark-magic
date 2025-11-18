import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Copy, Eye, Code, Split, FileText, FileCode, FileType, Droplets, FileDown, Columns } from 'lucide-react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { MarkdownPreview } from './MarkdownPreview';
import { Textarea } from '@/components/ui/textarea';
import { CodeViewerWithLineNumbers } from './CodeViewerWithLineNumbers';
import { ComparisonView } from './ComparisonView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { exportToPDF } from '@/utils/pdfExport';
import { exportToHTML } from '@/utils/htmlExport';
import { generateTableOfContents } from '@/utils/markdownUtils';
import { convertHtmlToMarkdown } from '@/utils/htmlToMarkdown';
import jsPDF from 'jspdf';

type ViewMode = 'edit' | 'preview' | 'split' | 'source' | 'comparison';

export const ScraperForm = () => {
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [useManualPaste, setUseManualPaste] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfFilename, setPdfFilename] = useState('');
  const { toast } = useToast();

  const handleFetchUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "No URL",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://evzhqncqhityotzodfsp.supabase.co/functions/v1/scrape-to-markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      const convertedMarkdown = data.markdown || data.content;
      const rawHtml = data.html || '';
      const titlePrefix = sectionTitle.trim() ? `# ${sectionTitle.trim()}\n\n` : '';
      const fullContent = titlePrefix + convertedMarkdown;
      setMarkdown(prev => prev ? prev + '\n\n---\n\n' + fullContent : fullContent);
      setSourceHtml(prev => prev ? prev + '\n\n<!-- Section Separator -->\n\n' + rawHtml : rawHtml);
      setSectionTitle('');
      
      if (convertedMarkdown.length < 100) {
        toast({
          title: "Warning",
          description: "Converted markdown is very short. Try manual paste if auto-fetch doesn't work well.",
        });
      } else {
        toast({
          title: "Success",
          description: sectionTitle.trim() 
            ? `Successfully converted URL to Markdown with title "${sectionTitle.trim()}"`
            : "Successfully converted URL to Markdown",
        });
      }
    } catch (error) {
      toast({
        title: "Fetch Failed",
        description: "Failed to fetch URL. Try pasting HTML manually instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = () => {
    if (!htmlContent.trim()) {
      toast({
        title: "No Content",
        description: "Please paste some HTML content first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const convertedMarkdown = convertHtmlToMarkdown(htmlContent);
      
      if (!convertedMarkdown || convertedMarkdown.length < 10) {
        toast({
          title: "Warning",
          description: "Converted content is very short. The HTML might not have readable content.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: sectionTitle.trim()
            ? `Content converted with title "${sectionTitle.trim()}"`
            : "Content converted to markdown successfully",
        });
      }
      
      const titlePrefix = sectionTitle.trim() ? `# ${sectionTitle.trim()}\n\n` : '';
      const fullContent = titlePrefix + convertedMarkdown;
      setMarkdown(prev => prev ? prev + '\n\n---\n\n' + fullContent : fullContent);
      setSectionTitle('');
    } catch (error) {
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Failed to convert content",
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
    a.download = 'content.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Markdown file downloaded successfully",
    });
  };

  const handleExportPlainText = () => {
    if (!markdown) return;

    const plainText = markdown
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/>\s/g, '')
      .replace(/[-*+]\s/g, '• ');

    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Plain text file downloaded successfully",
    });
  };

  const handleExportHTML = async () => {
    if (!markdown) return;

    try {
      const toc = generateTableOfContents(markdown);
      await exportToHTML({
        markdown,
        toc,
        filename: 'content.html',
        theme: 'light',
      });

      toast({
        title: "Downloaded",
        description: "HTML file downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export HTML file",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    if (!markdown) return;

    // Generate default filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const defaultFilename = url 
      ? `${new URL(url).hostname.replace(/\./g, '-')}-${timestamp}`
      : `content-${timestamp}`;
    
    setPdfFilename(defaultFilename);
    setShowPdfDialog(true);
  };

  const handleConfirmPdfExport = async () => {
    if (!markdown) return;

    try {
      const toc = generateTableOfContents(markdown);
      const filename = pdfFilename.endsWith('.pdf') ? pdfFilename : `${pdfFilename}.pdf`;
      
      await exportToPDF({
        markdown,
        toc,
        filename,
      });

      setShowPdfDialog(false);
      toast({
        title: "Downloaded",
        description: "PDF with all sections and table of contents downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file",
        variant: "destructive",
      });
    }
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

  const handleCopySource = async () => {
    if (!sourceHtml) return;

    try {
      await navigator.clipboard.writeText(sourceHtml);
      toast({
        title: "Copied",
        description: "HTML source copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSource = () => {
    if (!sourceHtml) return;

    const blob = new Blob([sourceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'source.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "HTML source file downloaded successfully",
    });
  };

  const handleDownloadSourceAsPdf = () => {
    if (!sourceHtml) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HTML Source Code', margin, currentY);
    currentY += 10;

    pdf.setFontSize(9);
    pdf.setFont('courier', 'normal');

    // Split HTML into lines and add to PDF
    const lines = sourceHtml.split('\n');
    
    for (const line of lines) {
      // Split long lines to fit page width
      const wrappedLines = pdf.splitTextToSize(line || ' ', contentWidth);
      
      for (const wrappedLine of wrappedLines) {
        // Check if we need a new page
        if (currentY + 5 > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.text(wrappedLine, margin, currentY);
        currentY += 4;
      }
    }

    pdf.save('source.pdf');

    toast({
      title: "Downloaded",
      description: "HTML source saved as PDF successfully",
    });
  };

  return (
    <div className="container max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Droplets className="h-10 w-10 text-primary animate-pulse" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            BobSWMM URL to Markdown Converter
          </h1>
          <FileCode className="h-10 w-10 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground text-lg">
          Paste HTML content and convert it to clean, formatted markdown for BobSWMM
        </p>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 shadow-lg mb-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Enter URL or Paste HTML
            </label>
            <Input
              type="text"
              placeholder="Section title (optional)"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2 mb-3">
              <Button
                variant={!useManualPaste ? "default" : "outline"}
                size="sm"
                onClick={() => setUseManualPaste(false)}
              >
                Auto-Fetch URL
              </Button>
              <Button
                variant={useManualPaste ? "default" : "outline"}
                size="sm"
                onClick={() => setUseManualPaste(true)}
              >
                Manual Paste
              </Button>
              {markdown && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  className="ml-auto"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            {!useManualPaste ? (
              <>
                <input
                  type="url"
                  placeholder="https://example.com/page-to-convert"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button 
                  onClick={handleFetchUrl} 
                  disabled={isLoading || !url.trim()}
                  size="lg"
                  className="w-full gap-2 font-semibold transition-all hover:scale-105 mt-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <FileCode className="h-5 w-5" />
                      Fetch & Convert to Markdown
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Textarea
                  placeholder="Paste your HTML content here..."
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  disabled={isLoading}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button 
                  onClick={handleConvert} 
                  disabled={isLoading || !htmlContent.trim()}
                  size="lg"
                  className="w-full gap-2 font-semibold transition-all hover:scale-105 mt-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <FileCode className="h-5 w-5" />
                      Convert to Markdown
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {markdown && !isLoading && (
        <div className="space-y-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Result</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {markdown.length.toLocaleString()} characters · {markdown.split(/\s+/).filter(word => word.length > 0).length.toLocaleString()} words
                </p>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Code className="h-4 w-4 mr-2" />
                      Markdown (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPlainText}>
                      <FileText className="h-4 w-4 mr-2" />
                      Plain Text (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportHTML}>
                      <FileCode className="h-4 w-4 mr-2" />
                      HTML (.html)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileType className="h-4 w-4 mr-2" />
                      PDF (.pdf) - All sections
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleCopy} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                variant={viewMode === 'edit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('edit')}
              >
                <Code className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('split')}
              >
                <Split className="h-4 w-4 mr-1" />
                Split
              </Button>
              <Button
                variant={viewMode === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('preview')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button
                variant={viewMode === 'source' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('source')}
              >
                <FileCode className="h-4 w-4 mr-1" />
                Source
              </Button>
              <Button
                variant={viewMode === 'comparison' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('comparison')}
                disabled={!sourceHtml}
              >
                <Columns className="h-4 w-4 mr-1" />
                Compare
              </Button>
            </div>

            {viewMode === 'edit' && (
              <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                <CodeEditor
                  value={markdown}
                  language="markdown"
                  placeholder="Converted markdown will appear here..."
                  onChange={(e) => setMarkdown(e.target.value)}
                  padding={15}
                  data-color-mode="dark"
                  style={{
                    fontSize: 14,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    minHeight: '500px',
                  }}
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="border border-border rounded-lg p-6 bg-background prose prose-neutral dark:prose-invert max-w-none overflow-auto" style={{ maxHeight: '600px' }}>
                <MarkdownPreview content={markdown} theme="vscDarkPlus" />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                  <CodeEditor
                    value={markdown}
                    language="markdown"
                    placeholder="Converted markdown..."
                    onChange={(e) => setMarkdown(e.target.value)}
                    padding={15}
                    data-color-mode="dark"
                    style={{
                      fontSize: 13,
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                      minHeight: '500px',
                    }}
                  />
                </div>
                <div className="border border-border rounded-lg p-6 bg-background prose prose-neutral dark:prose-invert max-w-none overflow-auto" style={{ maxHeight: '500px' }}>
                  <MarkdownPreview content={markdown} theme="vscDarkPlus" />
                </div>
              </div>
            )}

            {viewMode === 'source' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Original HTML Source</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Read-only view of the source HTML with line numbers
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleDownloadSourceAsPdf} variant="outline" size="sm" disabled={!sourceHtml}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button onClick={handleDownloadSource} variant="outline" size="sm" disabled={!sourceHtml}>
                      <Download className="h-4 w-4 mr-2" />
                      Download HTML
                    </Button>
                    <Button onClick={handleCopySource} variant="outline" size="sm" disabled={!sourceHtml}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy HTML
                    </Button>
                  </div>
                </div>
                <div className="max-h-[600px] overflow-auto">
                  {sourceHtml ? (
                    <CodeViewerWithLineNumbers code={sourceHtml} language="html" />
                  ) : (
                    <div className="border border-border rounded-lg p-8 bg-muted/30 text-center text-muted-foreground">
                      Original HTML source will appear here after conversion...
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'comparison' && (
              <ComparisonView 
                sourceHtml={sourceHtml}
                markdown={markdown}
                onMarkdownChange={setMarkdown}
              />
            )}
          </Card>
        </div>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all accumulated markdown content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setMarkdown('');
              setSourceHtml('');
              toast({
                title: "Cleared",
                description: "All content has been cleared",
              });
            }}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export PDF</DialogTitle>
            <DialogDescription>
              Customize the filename for your PDF export
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={pdfFilename}
                onChange={(e) => setPdfFilename(e.target.value)}
                placeholder="Enter filename"
                className="col-span-3"
              />
              <p className="text-xs text-muted-foreground">
                {pdfFilename && !pdfFilename.endsWith('.pdf') ? `${pdfFilename}.pdf` : pdfFilename || 'filename.pdf'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPdfExport}>
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
