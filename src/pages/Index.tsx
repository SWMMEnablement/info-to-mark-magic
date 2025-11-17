import { ScraperForm } from '@/components/ScraperForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkflowDiagram } from '@/components/WorkflowDiagram';

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 max-w-7xl">
        <WorkflowDiagram />
        <ScraperForm />
      </div>
    </div>
  );
};

export default Index;
