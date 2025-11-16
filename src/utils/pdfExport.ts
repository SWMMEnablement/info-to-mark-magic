import jsPDF from 'jspdf';
import type { TocItem } from './markdownUtils';

interface PDFExportOptions {
  markdown: string;
  toc: TocItem[];
  filename?: string;
}

export const exportToPDF = async ({ markdown, toc, filename = 'scraped-content.pdf' }: PDFExportOptions) => {
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

  // Helper function to add new page
  const addNewPage = () => {
    pdf.addPage();
    currentY = margin;
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (lineHeight: number) => {
    if (currentY + lineHeight > pageHeight - margin) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Title page
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Combined Content Export', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString();
  pdf.text(`Generated on: ${date}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  
  const sections = markdown.split('---').length;
  pdf.text(`Total sections: ${sections}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Table of Contents
  if (toc.length > 0) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Table of Contents', margin, currentY);
    currentY += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    for (const item of toc) {
      checkPageBreak(7);
      const indent = (item.level - 2) * 5;
      const text = `${'  '.repeat(item.level - 2)}${item.text}`;
      pdf.text(text, margin + indent, currentY);
      currentY += 7;
    }

    currentY += 10;
    checkPageBreak(10);
  }

  // Add page break before content
  addNewPage();

  // Parse and render markdown content
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      currentY += 5;
      continue;
    }

    // Handle headings
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '').replace(/\s*\{#[^}]+\}\s*$/, '');
      
      checkPageBreak(15);
      
      if (level === 1) {
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        currentY += 10;
      } else if (level === 2) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        currentY += 8;
      } else if (level === 3) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        currentY += 6;
      } else {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        currentY += 5;
      }
      
      const textLines = pdf.splitTextToSize(text, contentWidth);
      for (const textLine of textLines) {
        checkPageBreak(8);
        pdf.text(textLine, margin, currentY);
        currentY += 8;
      }
      
      currentY += 3;
      continue;
    }

    // Handle horizontal rules (section separators)
    if (line === '---' || line === '***') {
      checkPageBreak(15);
      currentY += 8;
      pdf.setLineWidth(1);
      pdf.setDrawColor(150, 150, 150);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      pdf.setDrawColor(0, 0, 0);
      currentY += 8;
      continue;
    }

    // Handle links [text](url)
    let processedLine = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    
    // Handle bold **text**
    processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // Handle italic *text*
    processedLine = processedLine.replace(/\*([^*]+)\*/g, '$1');

    // Handle list items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const text = processedLine.replace(/^[-*]\s+/, '');
      const textLines = pdf.splitTextToSize(`• ${text}`, contentWidth - 5);
      
      for (const textLine of textLines) {
        checkPageBreak(6);
        pdf.text(textLine, margin + 5, currentY);
        currentY += 6;
      }
      continue;
    }

    // Regular paragraph text
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const textLines = pdf.splitTextToSize(processedLine, contentWidth);
    
    for (const textLine of textLines) {
      checkPageBreak(6);
      pdf.text(textLine, margin, currentY);
      currentY += 6;
    }
    
    currentY += 2;
  }

  // Add page numbers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save the PDF
  pdf.save(filename);
};
