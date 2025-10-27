import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const parseMarkdown = (text: string): string => {
  // 1. Escape HTML to prevent XSS attacks
  let processedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Apply safe formatting rules in a specific order
  
  // Rule for horizontal line: --- -> <hr>
  processedText = processedText.replace(/^---$/gm, '<hr class="border-t border-gray-300/50 my-2">');
  
  // Rule for heading-style bold: #### text -> <strong>text</strong>
  processedText = processedText.replace(/^#### (.*$)/gm, '<strong>$1</strong>');

  // Rule for classic bold: **text** -> <strong>text</strong>
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 3. Convert newlines to <br> tags for display
  return processedText.replace(/\n/g, '<br />');
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const processedHtml = parseMarkdown(content);
  return <div className="prose max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: processedHtml }} />;
};

export default MarkdownRenderer;
