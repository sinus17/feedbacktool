export class LibraryBlock {
  // These are required by Editor.js interface but not currently used
  // @ts-expect-error - Required by Editor.js interface
  private _api: any;
  // @ts-expect-error - Required by Editor.js interface
  private _readOnly: boolean;
  private data: { artistId: string };
  private wrapper: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Library',
      icon: '📚',
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
    this.wrapper.classList.add('library-block');
    this.wrapper.style.cssText = 'width: 100%; margin: 2rem 0;';

    if (this.data.artistId) {
      const iframe = document.createElement('iframe');
      iframe.src = `http://localhost:3000/library?tab=feed&public=true&artist=${this.data.artistId}`;
      iframe.style.cssText = 'width: 100%; height: 800px; border: 1px solid rgb(55, 65, 81); border-radius: 0.5rem; background: black;';
      iframe.title = 'Video Library';
      
      this.wrapper.appendChild(iframe);
    } else {
      this.wrapper.innerHTML = `
        <div style="padding: 2rem; text-align: center; border: 2px dashed rgb(75, 85, 99); border-radius: 0.5rem; color: rgb(156, 163, 175);">
          <p style="margin: 0; font-size: 1rem;">📚 Video Library</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Artist ID required to display library</p>
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
