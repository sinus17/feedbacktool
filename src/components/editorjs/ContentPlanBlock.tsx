export class ContentPlanBlock {
  // These are required by Editor.js interface but not currently used
  // @ts-expect-error - Required by Editor.js interface
  private _api: any;
  // @ts-expect-error - Required by Editor.js interface
  private _readOnly: boolean;
  private data: { artistId: string; releaseDate?: string };
  private wrapper: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Content Plan',
      icon: '🗓',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data, api, readOnly, config }: any) {
    this._api = api;
    this._readOnly = readOnly;
    // Use data artistId if available, otherwise fall back to config artistId
    this.data = {
      artistId: data?.artistId || config?.artistId || '',
      releaseDate: data?.releaseDate || config?.releaseDate
    };
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('content-plan-block');
    this.wrapper.style.cssText = 'width: 100%; margin: 2rem 0;';

    if (this.data.artistId) {
      const iframe = document.createElement('iframe');
      // Always use production URL
      let url = `https://tool.swipeup-marketing.com/artist/${this.data.artistId}/content-plan?embedded=true`;
      if (this.data.releaseDate) {
        url += `&releaseDate=${encodeURIComponent(this.data.releaseDate)}`;
      }
      iframe.src = url;
      // Increase height to show full calendar without scroll
      iframe.style.cssText = 'width: 100%; height: 680px; border: none; border-radius: 0.5rem; background: black; display: block; overflow: hidden;';
      iframe.title = 'Content Plan Calendar';
      
      this.wrapper.appendChild(iframe);
    } else {
      this.wrapper.innerHTML = `
        <div style="padding: 2rem; text-align: center; border: 2px dashed rgb(75, 85, 99); border-radius: 0.5rem; color: rgb(156, 163, 175);">
          <p style="margin: 0; font-size: 1rem;">🗓 Content Plan</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Artist ID required to display calendar</p>
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
