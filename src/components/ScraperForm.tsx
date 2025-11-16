import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Copy, Eye, Code, Split, FileText, FileCode, FileType } from 'lucide-react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { MarkdownPreview } from './MarkdownPreview';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF } from '@/utils/pdfExport';
import { exportToHTML } from '@/utils/htmlExport';
import { generateTableOfContents } from '@/utils/markdownUtils';
import { convertHtmlToMarkdown } from '@/utils/htmlToMarkdown';

type ViewMode = 'edit' | 'preview' | 'split';

export const ScraperForm = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const { toast } = useToast();

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
          description: "Content converted to markdown successfully",
        });
      }
      
      setMarkdown(convertedMarkdown);
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

  const handleExportPDF = async () => {
    if (!markdown) return;

    try {
      const toc = generateTableOfContents(markdown);
      await exportToPDF({
        markdown,
        toc,
        filename: 'content.pdf',
      });

      toast({
        title: "Downloaded",
        description: "PDF file downloaded successfully",
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

  return (
    <div className="container max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FileCode className="h-10 w-10 text-primary animate-pulse" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            HTML to Markdown Converter
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Paste HTML content and convert it to clean, formatted markdown
        </p>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 shadow-lg mb-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Paste HTML Content
            </label>
            <Textarea
              placeholder="Paste your HTML content here..."
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              disabled={isLoading}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          <Button 
            onClick={handleConvert} 
            disabled={isLoading || !htmlContent.trim()}
            size="lg"
            className="w-full gap-2 font-semibold transition-all hover:scale-105"
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
        </div>
      </Card>

      {markdown && !isLoading && (
        <div className="space-y-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-2 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Result</h2>
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
                      PDF (.pdf)
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
          </Card>
        </div>
      )}
    </div>
  );
};
