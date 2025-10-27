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

  // 2. Apply markdown formatting rules in order
  
  // Code blocks (must be before inline code): ```language\ncode\n```
  processedText = processedText.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="bg-gray-100 rounded-lg p-2 sm:p-3 my-2 overflow-x-auto text-xs sm:text-sm max-w-full"><code class="language-${lang || 'text'} block whitespace-pre">${code.trim()}</code></pre>`;
  });
  
  // Inline code: `code`
  processedText = processedText.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono text-gray-800 break-all">$1</code>');
  
  // Headings
  processedText = processedText.replace(/^### (.*$)/gm, '<h3 class="text-base sm:text-lg font-bold mt-2 sm:mt-3 mb-1 sm:mb-2">$1</h3>');
  processedText = processedText.replace(/^## (.*$)/gm, '<h2 class="text-lg sm:text-xl font-bold mt-3 sm:mt-4 mb-1 sm:mb-2">$1</h2>');
  processedText = processedText.replace(/^# (.*$)/gm, '<h1 class="text-xl sm:text-2xl font-bold mt-3 sm:mt-4 mb-2 sm:mb-3">$1</h1>');
  
  // Horizontal line: ---
  processedText = processedText.replace(/^---$/gm, '<hr class="border-t border-gray-300/50 my-3">');
  
  // Bold: **text** or __text__
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  processedText = processedText.replace(/__(.*?)__/g, '<strong class="font-bold">$1</strong>');
  
  // Italic: *text* or _text_
  processedText = processedText.replace(/\*([^\*\n]+)\*/g, '<em class="italic">$1</em>');
  processedText = processedText.replace(/_([^_\n]+)_/g, '<em class="italic">$1</em>');
  
  // Strikethrough: ~~text~~
  processedText = processedText.replace(/~~(.*?)~~/g, '<del class="line-through">$1</del>');
  
  // Links: [text](url)
  processedText = processedText.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Unordered lists: - item or * item
  processedText = processedText.replace(/^[\*\-] (.+)$/gm, '<li class="ml-4">$1</li>');
  processedText = processedText.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-2 space-y-1">$&</ul>');
  
  // Ordered lists: 1. item
  processedText = processedText.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');
  processedText = processedText.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, (match) => {
    if (!match.includes('list-disc')) {
      return `<ol class="list-decimal list-inside my-2 space-y-1">${match}</ol>`;
    }
    return match;
  });
  
  // Blockquotes: > text
  processedText = processedText.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 italic text-gray-700 my-2">$1</blockquote>');
  
  // Convert newlines to <br> tags (but not inside pre/code blocks)
  processedText = processedText.replace(/\n(?![^<]*<\/(?:pre|code|ul|ol|blockquote)>)/g, '<br />');
  
  return processedText;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const processedHtml = parseMarkdown(content);
  return (
    <div 
      className="prose prose-sm sm:prose-base max-w-none prose-p:my-0 prose-headings:font-bold prose-a:text-blue-600 prose-code:text-sm prose-pre:text-xs sm:prose-pre:text-sm" 
      dangerouslySetInnerHTML={{ __html: processedHtml }} 
    />
  );
};

export default MarkdownRenderer;
