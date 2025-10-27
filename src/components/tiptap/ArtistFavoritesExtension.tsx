import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { ArtistFavorites } from '../ArtistFavorites';

// Node view component that wraps ArtistFavorites
const ArtistFavoritesNodeView = ({ node }: any) => {
  const artistId = node.attrs.artistId;
  
  return (
    <NodeViewWrapper className="artist-favorites-node">
      <ArtistFavorites artistId={artistId} />
    </NodeViewWrapper>
  );
};

export const ArtistFavoritesExtension = Node.create({
  name: 'artistFavorites',
  
  group: 'block',
  
  atom: true,
  
  draggable: false,
  
  addAttributes() {
    return {
      artistId: {
        default: null,
        parseHTML: element => element.getAttribute('data-artist-id'),
        renderHTML: attributes => {
          if (!attributes.artistId) {
            return {};
          }
          return {
            'data-artist-id': attributes.artistId,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="artist-favorites"]',
      },
      {
        tag: 'div[data-library-marker="true"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'artist-favorites' })];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ArtistFavoritesNodeView);
  },
  
  addCommands() {
    return {
      insertArtistFavorites:
        (artistId: string) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { artistId },
          });
        },
    } as any;
  },
});
