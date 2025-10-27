import { useEffect, useRef } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Image from '@editorjs/image';
import Quote from '@editorjs/quote';
import InlineCode from '@editorjs/inline-code';
// @ts-ignore
import Embed from '@editorjs/embed';
import { ArtistFavoritesBlock } from './ArtistFavoritesBlock';
import { CustomCodeTool } from './CustomCodeTool';
import { CustomLinkTool } from './CustomLinkTool';
import { ContentPlanBlock } from './ContentPlanBlock';
import { enableSlashCommands } from './SlashCommandPlugin';
// @ts-ignore
import Undo from 'editorjs-undo';

interface EditorJSWrapperProps {
  data?: OutputData;
  onChange?: (data: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
  artistId?: string;
  releaseDate?: string;
}

export const EditorJSWrapper = ({ 
  data, 
  onChange, 
  placeholder = 'Start typing...',
  readOnly = false,
  artistId,
  releaseDate
}: EditorJSWrapperProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!holderRef.current || isInitialized.current || editorRef.current) return;

    isInitialized.current = true;

    // Initialize Editor.js
    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder,
      readOnly,
      data: data || {
        blocks: []
      },
      defaultBlock: 'paragraph',
      tools: {
        header: {
          class: Header as any,
          inlineToolbar: true,
          config: {
            levels: [1, 2, 3],
            defaultLevel: 2
          }
        },
        list: {
          class: List as any,
          inlineToolbar: true,
        },
        paragraph: {
          class: Paragraph as any,
          inlineToolbar: true,
        },
        image: {
          class: Image,
          config: {
            uploader: {
              uploadByFile(file: File) {
                // TODO: Implement image upload to Supabase
                return Promise.resolve({
                  success: 1,
                  file: {
                    url: URL.createObjectURL(file),
                  }
                });
              },
              uploadByUrl(url: string) {
                return Promise.resolve({
                  success: 1,
                  file: {
                    url: url,
                  }
                });
              }
            }
          }
        },
        linkTool: {
          class: CustomLinkTool as any,
          config: {
            endpoint: 'http://localhost:8008/fetchUrl', // Your backend endpoint for url data fetching
          }
        },
        quote: {
          class: Quote as any,
          inlineToolbar: true,
        },
        code: {
          class: CustomCodeTool as any,
        },
        inlineCode: {
          class: InlineCode,
        },
        embed: {
          class: Embed,
          config: {
            services: {
              youtube: true,
              twitter: true,
              instagram: true,
              tiktok: true,
            }
          }
        },
        artistFavorites: {
          class: ArtistFavoritesBlock as any,
          config: {
            artistId: artistId || '',
          }
        },
        contentPlan: {
          class: ContentPlanBlock as any,
          config: {
            artistId: artistId || '',
            releaseDate: releaseDate || '',
          }
        },
      },
      onChange: async () => {
        if (onChange && editorRef.current) {
          try {
            await editorRef.current.isReady;
            const outputData = await editorRef.current.save();
            onChange(outputData);
          } catch (error) {
            console.error('Error saving editor data:', error);
          }
        }
      },
      onReady: () => {
        console.log('Editor.js is ready');
        // Enable slash commands
        if (holderRef.current) {
          enableSlashCommands(editor, holderRef.current);
        }
        // Initialize undo/redo
        new Undo({ editor });
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        isInitialized.current = false;
      }
    };
  }, []); // Only initialize once

  return (
    <div className="editorjs-wrapper w-full">
      <style>{`
        .codex-editor {
          color: white;
        }
        .codex-editor__redactor {
          padding-bottom: 16rem;
        }
        .ce-block__content,
        .ce-toolbar__content {
          max-width: none;
        }
        .ce-paragraph {
          color: rgb(229, 231, 235);
          line-height: 1.75;
        }
        .ce-header {
          font-weight: bold;
          color: white;
        }
        .ce-header[data-level="2"],
        h2.ce-header {
          font-size: 1.875rem !important;
          line-height: 2.25rem !important;
          margin-bottom: 1.5rem !important;
          padding-bottom: 0.75rem !important;
          margin-top: 1.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.01em !important;
        }
        .ce-header[data-level="1"] {
          font-size: 3.5rem !important;
          line-height: 4rem !important;
          margin-bottom: 2rem !important;
        }
        .ce-header[data-level="3"] {
          font-size: 2rem !important;
          line-height: 2.5rem !important;
          margin-bottom: 1rem !important;
        }
        .cdx-list {
          color: rgb(229, 231, 235);
        }
        .ce-code__textarea {
          background-color: rgb(31, 41, 55);
          color: rgb(229, 231, 235);
          font-family: monospace;
        }
        .cdx-quote {
          border-left: 4px solid rgb(59, 130, 246);
          padding-left: 1rem;
          font-style: italic;
          color: rgb(209, 213, 219);
        }
        .ce-inline-code {
          background-color: rgb(31, 41, 55);
          color: rgb(96, 165, 250);
          padding: 0 0.25rem;
          border-radius: 0.25rem;
        }
        /* Hide settings button completely */
        .ce-toolbar__settings-btn,
        .ce-settings {
          display: none !important;
        }
        
        /* Show plus button on hover */
        .ce-toolbar__plus {
          opacity: 0;
          transition: opacity 0.2s;
          color: rgb(156, 163, 175);
        }
        .ce-block:hover .ce-toolbar__plus {
          opacity: 1;
        }
        .ce-toolbar__plus:hover {
          color: white;
        }
        .ce-inline-toolbar,
        .ce-conversion-toolbar,
        .ce-settings,
        .ce-popover {
          background-color: black !important;
          border: 1px solid black !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
          z-index: 9999 !important;
        }
        .ce-inline-toolbar {
          display: flex !important;
          align-items: center !important;
          padding: 4px !important;
        }
        .ce-inline-toolbar__buttons {
          display: flex !important;
          gap: 2px !important;
        }
        .ce-popover__container {
          background-color: rgb(31, 41, 55) !important;
        }
        .ce-inline-tool,
        .ce-conversion-tool,
        .ce-settings__button,
        .ce-popover-item {
          color: white !important;
          cursor: pointer !important;
          padding: 6px 8px !important;
          border-radius: 4px !important;
          transition: background-color 0.15s ease !important;
        }
        .ce-inline-tool:hover,
        .ce-conversion-tool:hover,
        .ce-settings__button:hover,
        .ce-popover-item:hover {
          color: white !important;
          background-color: rgb(55, 65, 81) !important;
        }
        .ce-inline-tool--active {
          background-color: rgb(59, 130, 246) !important;
          color: white !important;
        }
        .ce-inline-tool svg,
        .ce-conversion-tool svg {
          fill: currentColor !important;
          stroke: currentColor !important;
        }
        /* Replace italic icon with Font Awesome icon */
        .ce-inline-tool--italic svg {
          display: none;
        }
        .ce-inline-tool--italic::before {
          content: '';
          display: inline-block;
          width: 20px;
          height: 20px;
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white"><path d="M256 128C256 110.3 270.3 96 288 96L480 96C497.7 96 512 110.3 512 128C512 145.7 497.7 160 480 160L421.3 160L288 480L352 480C369.7 480 384 494.3 384 512C384 529.7 369.7 544 352 544L160 544C142.3 544 128 529.7 128 512C128 494.3 142.3 480 160 480L218.7 480L352 160L288 160C270.3 160 256 145.7 256 128z"/></svg>');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        /* Replace link inline tool icon with Font Awesome icon */
        .ce-inline-tool--link svg {
          display: none;
        }
        .ce-inline-tool--link::before {
          content: '';
          display: inline-block;
          width: 20px;
          height: 20px;
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white"><path d="M451.5 160C434.9 160 418.8 164.5 404.7 172.7C388.9 156.7 370.5 143.3 350.2 133.2C378.4 109.2 414.3 96 451.5 96C537.9 96 608 166 608 252.5C608 294 591.5 333.8 562.2 363.1L491.1 434.2C461.8 463.5 422 480 380.5 480C294.1 480 224 410 224 323.5C224 322 224 320.5 224.1 319C224.6 301.3 239.3 287.4 257 287.9C274.7 288.4 288.6 303.1 288.1 320.8C288.1 321.7 288.1 322.6 288.1 323.4C288.1 374.5 329.5 415.9 380.6 415.9C405.1 415.9 428.6 406.2 446 388.8L517.1 317.7C534.4 300.4 544.2 276.8 544.2 252.3C544.2 201.2 502.8 159.8 451.7 159.8zM307.2 237.3C305.3 236.5 303.4 235.4 301.7 234.2C289.1 227.7 274.7 224 259.6 224C235.1 224 211.6 233.7 194.2 251.1L123.1 322.2C105.8 339.5 96 363.1 96 387.6C96 438.7 137.4 480.1 188.5 480.1C205 480.1 221.1 475.7 235.2 467.5C251 483.5 269.4 496.9 289.8 507C261.6 530.9 225.8 544.2 188.5 544.2C102.1 544.2 32 474.2 32 387.7C32 346.2 48.5 306.4 77.8 277.1L148.9 206C178.2 176.7 218 160.2 259.5 160.2C346.1 160.2 416 230.8 416 317.1C416 318.4 416 319.7 416 321C415.6 338.7 400.9 352.6 383.2 352.2C365.5 351.8 351.6 337.1 352 319.4C352 318.6 352 317.9 352 317.1C352 283.4 334 253.8 307.2 237.5z"/></svg>');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        /* Replace inline code tool icon with Font Awesome icon */
        .ce-inline-tool--code svg {
          display: none;
        }
        .ce-inline-tool--code::before {
          content: '';
          display: inline-block;
          width: 20px;
          height: 20px;
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white"><path d="M392.8 65.2C375.8 60.3 358.1 70.2 353.2 87.2L225.2 535.2C220.3 552.2 230.2 569.9 247.2 574.8C264.2 579.7 281.9 569.8 286.8 552.8L414.8 104.8C419.7 87.8 409.8 70.1 392.8 65.2zM457.4 201.3C444.9 213.8 444.9 234.1 457.4 246.6L530.8 320L457.4 393.4C444.9 405.9 444.9 426.2 457.4 438.7C469.9 451.2 490.2 451.2 502.7 438.7L598.7 342.7C611.2 330.2 611.2 309.9 598.7 297.4L502.7 201.4C490.2 188.9 469.9 188.9 457.4 201.4zM182.7 201.3C170.2 188.8 149.9 188.8 137.4 201.3L41.4 297.3C28.9 309.8 28.9 330.1 41.4 342.6L137.4 438.6C149.9 451.1 170.2 451.1 182.7 438.6C195.2 426.1 195.2 405.8 182.7 393.3L109.3 320L182.6 246.6C195.1 234.1 195.1 213.8 182.6 201.3z"/></svg>');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        .ce-popover-item__title {
          color: white !important;
        }
        .ce-popover-item__icon {
          color: rgb(156, 163, 175) !important;
        }
        .ce-popover-item:hover .ce-popover-item__icon {
          color: white !important;
        }
        .ce-popover__nothing-found-message {
          color: rgb(156, 163, 175) !important;
        }
        .ce-popover-item--active {
          background-color: rgb(55, 65, 81) !important;
        }
        .ce-popover-item--active .ce-popover-item__title,
        .ce-popover-item--active .ce-popover-item__icon {
          color: white !important;
        }
        .ce-popover-item-separator__line {
          background-color: rgb(55, 65, 81) !important;
        }
        .codex-editor--empty .ce-block:first-child .ce-paragraph[data-placeholder]:empty::before {
          color: rgb(107, 114, 128);
        }
        /* Text selection styling */
        .codex-editor ::selection {
          background-color: rgb(59, 130, 246) !important;
          color: white !important;
        }
        .codex-editor ::-moz-selection {
          background-color: rgb(59, 130, 246) !important;
          color: white !important;
        }
      `}</style>
      <div ref={holderRef} className="editorjs-holder prose prose-invert max-w-none" />
    </div>
  );
};
