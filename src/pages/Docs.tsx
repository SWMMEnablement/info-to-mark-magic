import { useState, useRef } from 'react';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { TableOfContents } from '@/components/TableOfContents';
import { DocsSearch } from '@/components/DocsSearch';
import { TocItem } from '@/utils/markdownUtils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import handoverContent from '/handover.md?raw';

const Docs = () => {
  const [scrollToHeading, setScrollToHeading] = useState<string | null>(null);
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">Documentation</h1>
        </div>
        <div className="flex items-center gap-2">
          <DocsSearch containerRef={contentRef} />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <TableOfContents
          markdown={handoverContent}
          onNavigate={(item: TocItem) => setScrollToHeading(item.id)}
        />
        <div ref={contentRef} className="flex-1 overflow-auto p-6">
          <MarkdownPreview
            content={handoverContent}
            scrollToHeading={scrollToHeading}
          />
        </div>
      </div>
    </div>
  );
};

export default Docs;
