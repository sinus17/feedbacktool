import { OutputData } from '@editorjs/editorjs';

export function htmlToEditorJS(html: string, artistId?: string): OutputData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: any[] = [];

  // Process each element in the body
  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Check for placeholder markers in templates
      const textContent = element.textContent?.trim() || '';
      if (textContent === '[ARTISTS_FAVORITES]' && artistId) {
        blocks.push({
          type: 'artistFavorites',
          data: {
            artistId: artistId,
          },
        });
        return;
      }
      
      if (textContent === '[CONTENT_PLAN]' && artistId) {
        blocks.push({
          type: 'contentPlan',
          data: {
            artistId: artistId,
          },
        });
        return;
      }

      // Check for artist favorites marker
      if (element.hasAttribute('data-type') && element.getAttribute('data-type') === 'artist-favorites') {
        const blockArtistId = element.getAttribute('data-artist-id') || artistId || '';
        blocks.push({
          type: 'artistFavorites',
          data: {
            artistId: blockArtistId,
          },
        });
        return;
      }

      // Check for content plan marker
      if (element.hasAttribute('data-type') && element.getAttribute('data-type') === 'content-plan') {
        const blockArtistId = element.getAttribute('data-artist-id') || artistId || '';
        blocks.push({
          type: 'contentPlan',
          data: {
            artistId: blockArtistId,
          },
        });
        return;
      }

      // Check for library marker
      if (element.hasAttribute('data-type') && element.getAttribute('data-type') === 'library') {
        const blockArtistId = element.getAttribute('data-artist-id') || artistId || '';
        blocks.push({
          type: 'library',
          data: {
            artistId: blockArtistId,
          },
        });
        return;
      }

      switch (tagName) {
        case 'h1':
          blocks.push({
            type: 'header',
            data: {
              text: element.textContent || '',
              level: 1,
            },
          });
          break;
        case 'h2':
          blocks.push({
            type: 'header',
            data: {
              text: element.textContent || '',
              level: 2,
            },
          });
          break;
        case 'h3':
          blocks.push({
            type: 'header',
            data: {
              text: element.textContent || '',
              level: 3,
            },
          });
          break;
        case 'p':
          const text = element.innerHTML || '';
          if (text.trim()) {
            blocks.push({
              type: 'paragraph',
              data: {
                text: text,
              },
            });
          }
          break;
        case 'ul':
          const ulItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
          if (ulItems.length > 0) {
            blocks.push({
              type: 'list',
              data: {
                style: 'unordered',
                items: ulItems,
              },
            });
          }
          break;
        case 'ol':
          const olItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
          if (olItems.length > 0) {
            blocks.push({
              type: 'list',
              data: {
                style: 'ordered',
                items: olItems,
              },
            });
          }
          break;
        case 'blockquote':
          blocks.push({
            type: 'quote',
            data: {
              text: element.textContent || '',
              caption: '',
            },
          });
          break;
        case 'pre':
          blocks.push({
            type: 'code',
            data: {
              code: element.textContent || '',
            },
          });
          break;
        case 'img':
          blocks.push({
            type: 'image',
            data: {
              file: {
                url: element.getAttribute('src') || '',
              },
              caption: element.getAttribute('alt') || '',
              withBorder: false,
              stretched: false,
              withBackground: false,
            },
          });
          break;
        default:
          // Process children for other elements
          Array.from(element.childNodes).forEach(processNode);
          break;
      }
    }
  };

  // Process all body children
  Array.from(doc.body.childNodes).forEach(processNode);

  // If no blocks were created, add an empty paragraph
  if (blocks.length === 0) {
    blocks.push({
      type: 'paragraph',
      data: {
        text: '',
      },
    });
  }

  return {
    time: Date.now(),
    blocks,
    version: '2.28.0',
  };
}

export function editorJSToHTML(data: any): string {
  if (!data || !data.blocks) return '';

  return data.blocks
    .map((block: any) => {
      switch (block.type) {
        case 'header':
          return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
        case 'paragraph':
          return `<p>${block.data.text}</p>`;
        case 'list':
          const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
          const items = block.data.items.map((item: string) => `<li>${item}</li>`).join('');
          return `<${tag}>${items}</${tag}>`;
        case 'quote':
          return `<blockquote>${block.data.text}</blockquote>`;
        case 'code':
          return `<pre><code>${block.data.code}</code></pre>`;
        case 'image':
          return `<img src="${block.data.file.url}" alt="${block.data.caption || ''}" />`;
        case 'artistFavorites':
          return `<div data-type="artist-favorites" data-artist-id="${block.data.artistId}"></div>`;
        case 'contentPlan':
          return `<div data-type="content-plan" data-artist-id="${block.data.artistId}"></div>`;
        case 'library':
          return `<div data-type="library" data-artist-id="${block.data.artistId}"></div>`;
        default:
          return '';
      }
    })
    .join('');
}
