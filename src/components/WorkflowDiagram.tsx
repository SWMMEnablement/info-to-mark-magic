import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const WorkflowDiagram = () => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'default',
      themeVariables: {
        primaryColor: 'hsl(var(--primary))',
        primaryTextColor: '#fff',
        primaryBorderColor: 'hsl(var(--primary))',
        lineColor: 'hsl(var(--border))',
        secondaryColor: 'hsl(var(--secondary))',
        tertiaryColor: 'hsl(var(--muted))',
      }
    });

    if (mermaidRef.current) {
      mermaid.contentLoaded();
    }
  }, []);

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
      
      style A fill:hsl(var(--primary)),stroke:hsl(var(--primary)),color:#fff
      style P fill:hsl(var(--primary)),stroke:hsl(var(--primary)),color:#fff
      style I fill:hsl(var(--accent)),stroke:hsl(var(--accent))
  `;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>How It Works</CardTitle>
        <CardDescription>
          Follow this workflow to convert multiple pages into a single markdown document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={mermaidRef} className="mermaid bg-background p-4 rounded-md overflow-x-auto">
          {diagram}
        </div>
      </CardContent>
    </Card>
  );
};
