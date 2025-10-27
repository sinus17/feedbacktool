import { createRoot } from 'react-dom/client';
import { ArtistFavorites } from '../ArtistFavorites';

export class ArtistFavoritesBlock {
  // These are required by Editor.js interface but not currently used
  // @ts-expect-error - Required by Editor.js interface
  private _api: any;
  // @ts-expect-error - Required by Editor.js interface
  private _readOnly: boolean;
  private data: { artistId: string };
  private wrapper: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Artist Favorites',
      icon: '⭐',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data, api, readOnly }: any) {
    this._api = api;
    this._readOnly = readOnly;
    this.data = data || { artistId: '' };
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('artist-favorites-block');

    if (this.data.artistId) {
      const root = createRoot(this.wrapper);
      root.render(<ArtistFavorites artistId={this.data.artistId} />);
    } else {
      this.wrapper.innerHTML = `
        <div class="bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
          <p class="text-gray-400">⭐ Artist Favorites Block</p>
          <p class="text-sm text-gray-500 mt-2">Artist ID will be set automatically</p>
        </div>
      `;
    }

    return this.wrapper;
  }

  save() {
    return this.data;
  }

  validate(_savedData: any) {
    return true;
  }

  renderSettings() {
    return [];
  }
}
