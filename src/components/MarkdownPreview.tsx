import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneDark, atomDark, nightOwl, dracula, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type SyntaxTheme = 'vscDarkPlus' | 'oneDark' | 'atomDark' | 'nightOwl' | 'dracula' | 'vs';

interface MarkdownPreviewProps {
  content: string;
  theme?: SyntaxTheme;
  scrollToHeading?: string | null;
}

const themeMap = {
  vscDarkPlus,
  oneDark,
  atomDark,
  nightOwl,
  dracula,
  vs,
};

export const MarkdownPreview = ({ content, theme = 'vscDarkPlus', scrollToHeading }: MarkdownPreviewProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollToHeading && containerRef.current) {
      const el = containerRef.current.querySelector(`[id="${scrollToHeading}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [scrollToHeading]);

  const makeId = (children: React.ReactNode) => {
    const text = typeof children === 'string' ? children : 
      Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') :
      '';
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  };

  return (
    <div ref={containerRef} className="prose prose-sm max-w-none dark:prose-invert bg-background p-6 rounded-lg border border-border overflow-auto max-h-[600px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={themeMap[theme]}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 id={makeId(children)} className="text-3xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 id={makeId(children)} className="text-2xl font-bold mt-6 mb-3 text-foreground border-b border-border pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 id={makeId(children)} className="text-xl font-semibold mt-5 mb-2 text-foreground">
              {children}
            </h3>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary hover:text-primary/80 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
