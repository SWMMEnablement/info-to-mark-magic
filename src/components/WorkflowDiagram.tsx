import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const WorkflowDiagram = () => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!isOpen || !mermaidRef.current) return;

      const getHslValue = (cssVar: string) => {
        const value = getComputedStyle(document.documentElement)
          .getPropertyValue(cssVar)
          .trim();
        return value ? `hsl(${value})` : '#4A90E2';
      };

      const primaryColor = getHslValue('--primary');
      const accentColor = getHslValue('--accent');

      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'base',
        themeVariables: {
          primaryColor: primaryColor,
          primaryTextColor: '#ffffff',
          primaryBorderColor: primaryColor,
          lineColor: '#A0AEC0',
          secondaryColor: accentColor,
          tertiaryColor: '#E2E8F0',
        }
      });

      try {
        const { svg } = await mermaid.render('workflow-diagram', diagram);
        setSvgContent(svg);
      } catch (error) {
        console.error('Error rendering mermaid diagram:', error);
      }
    };

    renderDiagram();
  }, [isOpen]);

  const diagram = `
    graph TD
      A[Start] --> B{Choose Input Method}
      B -->|Manual Paste| C[Paste HTML Content]
      B -->|Fetch URL| D[Enter Website URL]
      D --> E[Fetch HTML]
      E --> C
      C --> F{Add Section Title?}
      F -->|Yes| G[Enter Section Title]
      F -->|No| H[Convert to Markdown]
      G --> H
      H --> I[Content Accumulated]
      I --> J{Add More Pages?}
      J -->|Yes| B
      J -->|No| K[Preview & Edit]
      K --> L{Export Options}
      L -->|PDF| M[Export as PDF]
      L -->|HTML| N[Export as HTML]
      L -->|XML| O[Export as XML]
      M --> P[Done]
      N --> P
      O --> P
      
      classDef startEnd fill:#4A90E2,stroke:#4A90E2,color:#fff
      classDef accent fill:#E2E8F0,stroke:#E2E8F0
      class A,P startEnd
      class I accent
  `;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Follow this workflow to convert multiple pages into a single markdown document
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="animate-accordion-down">
            <div 
              ref={mermaidRef} 
              className="bg-background p-4 rounded-md overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
