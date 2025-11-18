import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Highlighter, Search, X, Split, ArrowLeftRight, Copy } from 'lucide-react';
import { CodeViewerWithLineNumbers } from './CodeViewerWithLineNumbers';
import CodeEditor from '@uiw/react-textarea-code-editor';

interface ComparisonViewProps {
  sourceHtml: string;
  markdown: string;
  onMarkdownChange: (value: string) => void;
}

export const ComparisonView = ({ sourceHtml, markdown, onMarkdownChange }: ComparisonViewProps) => {
  const [highlightMode, setHighlightMode] = useState(false);
  const [selectedHtmlRange, setSelectedHtmlRange] = useState<{ start: number; end: number; score: number } | null>(null);
  const [selectedMdRange, setSelectedMdRange] = useState<{ start: number; end: number; score: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatches, setSearchMatches] = useState<{ html: number[]; markdown: number[] }>({ html: [], markdown: [] });
  const htmlScrollRef = useRef<HTMLDivElement>(null);
  const mdScrollRef = useRef<HTMLDivElement>(null);
  const [isSyncScrolling, setIsSyncScrolling] = useState(true);
  const [isSwapped, setIsSwapped] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Get color based on match confidence score
  const getMatchColor = (score: number, totalWords: number) => {
    const confidence = score / totalWords;
    if (confidence >= 0.7) return 'rgba(34, 197, 94, 0.25)'; // Green - high confidence
    if (confidence >= 0.5) return 'rgba(234, 179, 8, 0.25)'; // Yellow - medium confidence
    return 'rgba(249, 115, 22, 0.25)'; // Orange - low confidence
  };

  const getMatchLabel = (score: number, totalWords: number) => {
    const confidence = score / totalWords;
    if (confidence >= 0.7) return 'High confidence match';
    if (confidence >= 0.5) return 'Medium confidence match';
    return 'Low confidence match';
  };

  // Find text in markdown that corresponds to HTML selection
  const findCorrespondingMarkdown = (htmlText: string) => {
    // Clean the HTML text (remove tags, normalize whitespace)
    const cleanText = htmlText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (cleanText.length < 5) return null;

    // Search for similar text in markdown
    const mdLower = markdown.toLowerCase();
    const words = cleanText.split(' ').filter(w => w.length > 3);
    
    // Try to find a section with most matching words
    let bestMatch = { start: -1, end: -1, score: 0 };
    
    for (let i = 0; i < mdLower.length - 20; i++) {
      let score = 0;
      const window = mdLower.substring(i, Math.min(i + cleanText.length * 2, mdLower.length));
      
      for (const word of words) {
        if (window.includes(word)) score++;
      }
      
      if (score > bestMatch.score && score >= words.length * 0.4) {
        bestMatch = {
          start: i,
          end: Math.min(i + cleanText.length * 2, mdLower.length),
          score: score / words.length
        };
      }
    }
    
    return bestMatch.score > 0 ? { start: bestMatch.start, end: bestMatch.end, score: bestMatch.score } : null;
  };

  // Find HTML that corresponds to markdown selection
  const findCorrespondingHtml = (mdText: string) => {
    const cleanMdText = mdText
      .replace(/[#*_`\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (cleanMdText.length < 5) return null;

    const htmlLower = sourceHtml.toLowerCase();
    const words = cleanMdText.split(' ').filter(w => w.length > 3);
    
    let bestMatch = { start: -1, end: -1, score: 0 };
    
    for (let i = 0; i < htmlLower.length - 20; i++) {
      let score = 0;
      const window = htmlLower.substring(i, Math.min(i + cleanMdText.length * 3, htmlLower.length));
      
      for (const word of words) {
        if (window.includes(word)) score++;
      }
      
      if (score > bestMatch.score && score >= words.length * 0.4) {
        bestMatch = {
          start: i,
          end: Math.min(i + cleanMdText.length * 3, htmlLower.length),
          score: score / words.length
        };
      }
    }
    
    return bestMatch.score > 0 ? { start: bestMatch.start, end: bestMatch.end, score: bestMatch.score } : null;
  };

  // Search functionality
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchMatches({ html: [], markdown: [] });
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const htmlMatches: number[] = [];
    const mdMatches: number[] = [];

    // Find in HTML
    let htmlIndex = sourceHtml.toLowerCase().indexOf(searchLower);
    while (htmlIndex !== -1) {
      htmlMatches.push(htmlIndex);
      htmlIndex = sourceHtml.toLowerCase().indexOf(searchLower, htmlIndex + 1);
    }

    // Find in Markdown
    let mdIndex = markdown.toLowerCase().indexOf(searchLower);
    while (mdIndex !== -1) {
      mdMatches.push(mdIndex);
      mdIndex = markdown.toLowerCase().indexOf(searchLower, mdIndex + 1);
    }

    setSearchMatches({ html: htmlMatches, markdown: mdMatches });
  }, [searchTerm, sourceHtml, markdown]);

  // Synchronized scrolling
  const handleHtmlScroll = () => {
    if (!isSyncScrolling || !htmlScrollRef.current || !mdScrollRef.current) return;
    
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (htmlScrollRef.current && mdScrollRef.current) {
        const scrollPercentage = htmlScrollRef.current.scrollTop / 
          (htmlScrollRef.current.scrollHeight - htmlScrollRef.current.clientHeight);
        
        mdScrollRef.current.scrollTop = scrollPercentage * 
          (mdScrollRef.current.scrollHeight - mdScrollRef.current.clientHeight);
      }
    }, 10);
  };

  const handleMdScroll = () => {
    if (!isSyncScrolling || !htmlScrollRef.current || !mdScrollRef.current) return;
    
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (htmlScrollRef.current && mdScrollRef.current) {
        const scrollPercentage = mdScrollRef.current.scrollTop / 
          (mdScrollRef.current.scrollHeight - mdScrollRef.current.clientHeight);
        
        htmlScrollRef.current.scrollTop = scrollPercentage * 
          (htmlScrollRef.current.scrollHeight - htmlScrollRef.current.clientHeight);
      }
    }, 10);
  };

  // Copy handlers
  const handleCopyHtml = async () => {
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

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast({
        title: "Copied",
        description: "Markdown content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleHtmlSelection = () => {
    if (!highlightMode) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    
    if (selectedText && selectedText.length > 5) {
      const range = findCorrespondingMarkdown(selectedText);
      if (range) {
        setSelectedMdRange(range);
        // Highlight in editor
        setTimeout(() => {
          const editor = document.querySelector('[data-color-mode="dark"] textarea') as HTMLTextAreaElement;
          if (editor) {
            editor.focus();
            editor.setSelectionRange(range.start, range.end);
            editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  };

  const handleMarkdownSelection = () => {
    if (!highlightMode) return;
    
    const editor = document.querySelector('[data-color-mode="dark"] textarea') as HTMLTextAreaElement;
    if (editor) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selectedText = markdown.substring(start, end);
      
      if (selectedText.length > 5) {
        const range = findCorrespondingHtml(selectedText);
        if (range) {
          setSelectedHtmlRange(range);
        }
      }
    }
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-foreground">HTML to Markdown Comparison</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {highlightMode 
                ? "Select text in one panel to see color-coded matches in the other"
                : "Side-by-side view of original HTML and converted markdown"
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSwapped(!isSwapped)}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Swap
            </Button>
            <Button
              variant={isSyncScrolling ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSyncScrolling(!isSyncScrolling)}
            >
              <Split className="h-4 w-4 mr-2" />
              {isSyncScrolling ? "Sync On" : "Sync Off"}
            </Button>
            <Button
              variant={highlightMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setHighlightMode(!highlightMode);
                setSelectedHtmlRange(null);
                setSelectedMdRange(null);
              }}
            >
              <Highlighter className="h-4 w-4 mr-2" />
              {highlightMode ? "Highlighting On" : "Highlighting Off"}
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search across both panels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <>
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                {searchMatches.html.length + searchMatches.markdown.length} matches
              </div>
            </>
          )}
        </div>

        {/* Match confidence legend */}
        {highlightMode && (selectedHtmlRange || selectedMdRange) && (
          <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-lg text-xs">
            <span className="font-medium text-foreground">Match Confidence:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }} />
              <span className="text-muted-foreground">High (70%+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(234, 179, 8, 0.5)' }} />
              <span className="text-muted-foreground">Medium (50-70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.5)' }} />
              <span className="text-muted-foreground">Low (&lt;50%)</span>
            </div>
            {selectedMdRange && (
              <span className="ml-auto text-foreground font-medium">
                Current: {getMatchLabel(selectedMdRange.score, 1)}
              </span>
            )}
            {selectedHtmlRange && !selectedMdRange && (
              <span className="ml-auto text-foreground font-medium">
                Current: {getMatchLabel(selectedHtmlRange.score, 1)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* HTML Panel */}
        <div className={isSwapped ? 'order-2' : 'order-1'}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Original HTML {highlightMode && "(Select text to highlight)"}
            </p>
            <div className="flex items-center gap-2">
              {searchMatches.html.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {searchMatches.html.length} {searchMatches.html.length === 1 ? 'match' : 'matches'}
                </span>
              )}
              <Button 
                onClick={handleCopyHtml} 
                variant="ghost" 
                size="sm" 
                disabled={!sourceHtml}
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3 mr-1" />
                <span className="text-xs">Copy</span>
              </Button>
            </div>
          </div>
          <div 
            ref={htmlScrollRef}
            className={`max-h-[600px] overflow-auto ${highlightMode ? 'cursor-text' : ''}`}
            onMouseUp={handleHtmlSelection}
            onScroll={handleHtmlScroll}
          >
            {sourceHtml ? (
              <div className="relative">
                <CodeViewerWithLineNumbers code={sourceHtml} language="html" />
                {selectedHtmlRange && highlightMode && (
                  <div 
                    className="absolute inset-0 pointer-events-none rounded"
                    style={{
                      background: `linear-gradient(transparent ${selectedHtmlRange.start / sourceHtml.length * 100}%, ${getMatchColor(selectedHtmlRange.score, 1)} ${selectedHtmlRange.start / sourceHtml.length * 100}%, ${getMatchColor(selectedHtmlRange.score, 1)} ${selectedHtmlRange.end / sourceHtml.length * 100}%, transparent ${selectedHtmlRange.end / sourceHtml.length * 100}%)`
                    }}
                  />
                )}
                {searchMatches.html.map((matchIndex, i) => {
                  const matchLength = searchTerm.length;
                  const startPercent = (matchIndex / sourceHtml.length) * 100;
                  const endPercent = ((matchIndex + matchLength) / sourceHtml.length) * 100;
                  return (
                    <div 
                      key={`html-match-${i}`}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(transparent ${startPercent}%, rgba(59, 130, 246, 0.3) ${startPercent}%, rgba(59, 130, 246, 0.3) ${endPercent}%, transparent ${endPercent}%)`
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="border border-border rounded-lg p-8 bg-muted/30 text-center text-muted-foreground text-sm">
                No HTML source available
              </div>
            )}
          </div>
        </div>

        {/* Markdown Panel */}
        <div className={isSwapped ? 'order-1' : 'order-2'}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Converted Markdown {highlightMode && "(Select text to find in HTML)"}
            </p>
            <div className="flex items-center gap-2">
              {searchMatches.markdown.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {searchMatches.markdown.length} {searchMatches.markdown.length === 1 ? 'match' : 'matches'}
                </span>
              )}
              <Button 
                onClick={handleCopyMarkdown} 
                variant="ghost" 
                size="sm"
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3 mr-1" />
                <span className="text-xs">Copy</span>
              </Button>
            </div>
          </div>
          <div 
            ref={mdScrollRef}
            className="border border-border rounded-lg overflow-hidden bg-muted/30 max-h-[600px] overflow-auto relative"
            onMouseUp={handleMarkdownSelection}
            onScroll={handleMdScroll}
          >
            <CodeEditor
              value={markdown}
              language="markdown"
              placeholder="Converted markdown..."
              onChange={(e) => onMarkdownChange(e.target.value)}
              padding={15}
              data-color-mode="dark"
              style={{
                fontSize: 13,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                minHeight: '600px',
              }}
            />
            {selectedMdRange && highlightMode && (
              <div 
                className="absolute inset-0 pointer-events-none rounded"
                style={{
                  background: `linear-gradient(transparent ${selectedMdRange.start / markdown.length * 100}%, ${getMatchColor(selectedMdRange.score, 1)} ${selectedMdRange.start / markdown.length * 100}%, ${getMatchColor(selectedMdRange.score, 1)} ${selectedMdRange.end / markdown.length * 100}%, transparent ${selectedMdRange.end / markdown.length * 100}%)`
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
