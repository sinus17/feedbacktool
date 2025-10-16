import React, { useEffect, useState, useCallback } from 'react';
import { SimpleNovelEditor } from './SimpleNovelEditor';
import type { JSONContent } from 'novel';

interface ReleaseSheetNovelWrapperProps {
  initialHtml?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  editable?: boolean;
}

// Convert HTML to Novel JSON format
const htmlToNovelJson = (html: string): JSONContent => {
  console.log('🔄 Converting HTML to Novel JSON:', html?.substring(0, 200));
  
  if (!html || html.trim() === '') {
    console.log('⚠️ No HTML content provided');
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    };
  }

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  console.log('📝 Parsed HTML nodes:', tempDiv.childNodes.length);

  const content: any[] = [];

  // Simple conversion - parse basic HTML elements
  const parseNode = (node: Node, depth: number = 0): any => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        return { type: 'text', text: text };
      }
      return null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Parse children recursively
      const parseChildren = () => {
        const children = Array.from(element.childNodes)
          .map(child => parseNode(child, depth + 1))
          .filter(Boolean);
        return children.length > 0 ? children : [{ type: 'text', text: '' }];
      };

      switch (tagName) {
        case 'h1':
          return {
            type: 'heading',
            attrs: { level: 1 },
            content: parseChildren(),
          };
        case 'h2':
          return {
            type: 'heading',
            attrs: { level: 2 },
            content: parseChildren(),
          };
        case 'h3':
          return {
            type: 'heading',
            attrs: { level: 3 },
            content: parseChildren(),
          };
        case 'p':
          return {
            type: 'paragraph',
            content: parseChildren(),
          };
        case 'div':
          // For divs, extract text content and wrap in paragraph
          const divText = element.textContent?.trim();
          if (divText) {
            return {
              type: 'paragraph',
              content: [{ type: 'text', text: divText }],
            };
          }
          // If div has children, parse them
          const divChildren = parseChildren();
          if (divChildren.length > 0 && divChildren.some(c => c.type !== 'text' || c.text)) {
            return {
              type: 'paragraph',
              content: divChildren,
            };
          }
          return null;
        case 'ul':
          return {
            type: 'bulletList',
            content: Array.from(element.children).map((li) => ({
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: Array.from(li.childNodes).map(child => parseNode(child, depth + 1)).filter(Boolean),
              }],
            })).filter(item => item.content[0].content.length > 0),
          };
        case 'ol':
          return {
            type: 'orderedList',
            content: Array.from(element.children).map((li) => ({
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: Array.from(li.childNodes).map(child => parseNode(child, depth + 1)).filter(Boolean),
              }],
            })).filter(item => item.content[0].content.length > 0),
          };
        case 'br':
          return { type: 'hardBreak' };
        case 'strong':
        case 'b':
          const boldText = element.textContent || '';
          if (boldText.trim()) {
            return {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: boldText,
            };
          }
          return null;
        case 'em':
        case 'i':
          const italicText = element.textContent || '';
          if (italicText.trim()) {
            return {
              type: 'text',
              marks: [{ type: 'italic' }],
              text: italicText,
            };
          }
          return null;
        case 'u':
          const underlineText = element.textContent || '';
          if (underlineText.trim()) {
            return {
              type: 'text',
              marks: [{ type: 'underline' }],
              text: underlineText,
            };
          }
          return null;
        case 'img':
          return {
            type: 'image',
            attrs: {
              src: element.getAttribute('src') || '',
              alt: element.getAttribute('alt') || '',
            },
          };
        default:
          // For unknown elements, extract text or parse children
          const text = element.textContent?.trim();
          if (text && depth === 0) {
            // Top level unknown elements become paragraphs
            return {
              type: 'paragraph',
              content: [{ type: 'text', text }],
            };
          } else if (text) {
            // Nested unknown elements just return text
            return { type: 'text', text };
          }
          return null;
      }
    }

    return null;
  };

  Array.from(tempDiv.childNodes).forEach((node) => {
    const parsed = parseNode(node);
    if (parsed) {
      content.push(parsed);
    }
  });

  // If no content was parsed, add an empty paragraph
  if (content.length === 0) {
    console.log('⚠️ No content parsed, adding empty paragraph');
    content.push({
      type: 'paragraph',
      content: [],
    });
  }

  const result = {
    type: 'doc',
    content,
  };
  
  console.log('✅ Converted to Novel JSON:', JSON.stringify(result, null, 2).substring(0, 500));
  return result;
};

// Convert Novel JSON to HTML
const novelJsonToHtml = (json: JSONContent): string => {
  if (!json || !json.content) return '';

  const renderNode = (node: any): string => {
    if (!node) return '';

    switch (node.type) {
      case 'doc':
        return node.content?.map(renderNode).join('') || '';
      
      case 'paragraph':
        const pContent = node.content?.map(renderNode).join('') || '';
        return `<p>${pContent || '<br>'}</p>`;
      
      case 'heading':
        const level = node.attrs?.level || 1;
        const hContent = node.content?.map(renderNode).join('') || '';
        return `<h${level}>${hContent}</h${level}>`;
      
      case 'text':
        let text = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                text = `<strong>${text}</strong>`;
                break;
              case 'italic':
                text = `<em>${text}</em>`;
                break;
              case 'underline':
                text = `<u>${text}</u>`;
                break;
              case 'code':
                text = `<code>${text}</code>`;
                break;
              case 'link':
                text = `<a href="${mark.attrs?.href || '#'}">${text}</a>`;
                break;
            }
          });
        }
        return text;
      
      case 'bulletList':
        const ulContent = node.content?.map(renderNode).join('') || '';
        return `<ul>${ulContent}</ul>`;
      
      case 'orderedList':
        const olContent = node.content?.map(renderNode).join('') || '';
        return `<ol>${olContent}</ol>`;
      
      case 'listItem':
        const liContent = node.content?.map(renderNode).join('') || '';
        return `<li>${liContent}</li>`;
      
      case 'codeBlock':
        const codeContent = node.content?.map(renderNode).join('') || '';
        return `<pre><code>${codeContent}</code></pre>`;
      
      case 'blockquote':
        const quoteContent = node.content?.map(renderNode).join('') || '';
        return `<blockquote>${quoteContent}</blockquote>`;
      
      case 'hardBreak':
        return '<br>';
      
      case 'image':
        return `<img src="${node.attrs?.src || ''}" alt="${node.attrs?.alt || ''}" />`;
      
      default:
        return node.content?.map(renderNode).join('') || '';
    }
  };

  return renderNode(json);
};

export const ReleaseSheetNovelWrapper: React.FC<ReleaseSheetNovelWrapperProps> = ({
  initialHtml = '',
  onChange,
  onBlur,
  editable = true,
}) => {
  console.log('🎨 ReleaseSheetNovelWrapper rendered with initialHtml length:', initialHtml?.length);
  console.log('🎨 First 200 chars:', initialHtml?.substring(0, 200));
  
  const [jsonContent, setJsonContent] = useState<JSONContent>(() => htmlToNovelJson(initialHtml));

  // Update JSON content when initialHtml changes
  useEffect(() => {
    console.log('🔄 initialHtml changed, length:', initialHtml?.length);
    if (initialHtml) {
      setJsonContent(htmlToNovelJson(initialHtml));
    }
  }, [initialHtml]);

  const handleChange = useCallback((json: JSONContent) => {
    setJsonContent(json);
    const html = novelJsonToHtml(json);
    onChange?.(html);
  }, [onChange]);

  return (
    <SimpleNovelEditor
      initialContent={jsonContent}
      onChange={handleChange}
      onBlur={onBlur}
      editable={editable}
    />
  );
};
