'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Premium answer rendering — ChatGPT/Claude-style reading typography.
 * Gemini returns markdown; this renders it with a tuned Tailwind `prose`
 * theme: charcoal text, comfortable line-height, soft code cards, clean
 * lists and headings. No heavy borders or shadows.
 */
export default function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div
      className="
        prose prose-zinc max-w-none
        text-[16px] leading-[1.7] text-[#26282f] sm:text-[16.5px]
        prose-p:my-3 prose-p:leading-[1.7]
        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[#1a1f2e]
        prose-h1:text-[1.4em] prose-h1:mt-6 prose-h1:mb-3
        prose-h2:text-[1.25em] prose-h2:mt-6 prose-h2:mb-2.5
        prose-h3:text-[1.1em] prose-h3:mt-5 prose-h3:mb-2
        prose-strong:font-semibold prose-strong:text-[#1a1f2e]
        prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:leading-[1.65]
        prose-ul:pl-5 prose-ol:pl-5
        marker:text-[#9a9ba5]
        prose-a:text-[#3b63c4] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-2 prose-blockquote:border-[#d6d9e3]
        prose-blockquote:pl-4 prose-blockquote:text-[#5c5f6b] prose-blockquote:not-italic
        prose-code:rounded-md prose-code:bg-[#f1f1ee] prose-code:px-1.5 prose-code:py-0.5
        prose-code:text-[0.875em] prose-code:font-normal prose-code:text-[#3a3d47]
        prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:rounded-xl
        prose-pre:border prose-pre:border-[#e8e8e4] prose-pre:bg-[#f7f7f5]
        prose-pre:p-4 prose-pre:text-[13.5px] prose-pre:leading-[1.6] prose-pre:text-[#2a2e3a]
        prose-hr:border-[#e8e8e4] prose-hr:my-6
        prose-table:text-[14px]
        prose-th:border prose-th:border-[#e8e8e4] prose-th:bg-[#f7f7f5] prose-th:px-3 prose-th:py-1.5
        prose-td:border prose-td:border-[#e8e8e4] prose-td:px-3 prose-td:py-1.5
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
