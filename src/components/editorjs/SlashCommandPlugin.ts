export class SlashCommandPlugin {
  private _api: any;
  private _config: any;

  constructor({ api, config }: any) {
    this._api = api;
    this._config = config;
  }

  static get isInline() {
    return true;
  }

  render() {
    return document.createElement('span');
  }

  surround() {}

  checkState() {}

  static get sanitize() {
    return {
      span: true,
    };
  }
}

// Add keyboard listener to Editor.js for Notion-style slash commands
export function enableSlashCommands(_editor: any, holder: HTMLElement) {
  if (!holder) return;

  let slashMenu: HTMLElement | null = null;

  function createSlashMenu(target: HTMLElement) {
    // Remove existing menu if any
    if (slashMenu) {
      slashMenu.remove();
    }

    // Create menu
    slashMenu = document.createElement('div');
    slashMenu.className = 'slash-command-menu';
    slashMenu.style.cssText = `
      position: fixed;
      background: black;
      border: 1px solid rgb(55, 65, 81);
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      min-width: 250px;
      max-height: 400px;
      overflow-y: auto;
      padding: 4px;
    `;

    // Get cursor position using Selection API
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Position menu at cursor
      slashMenu.style.top = `${rect.bottom + 5}px`;
      slashMenu.style.left = `${rect.left}px`;
    } else {
      // Fallback to target position
      const rect = target.getBoundingClientRect();
      slashMenu.style.top = `${rect.bottom + 5}px`;
      slashMenu.style.left = `${rect.left}px`;
    }

    // Trigger the plus button to get the menu items
    const plusButton = target.closest('.ce-block')?.querySelector('.ce-toolbar__plus') as HTMLElement;
    if (plusButton) {
      plusButton.click();
      
      // Wait for popover to appear and clone its items
      setTimeout(() => {
        const popover = document.querySelector('.ce-popover__items');
        if (popover && slashMenu) {
          slashMenu.innerHTML = popover.innerHTML;
          document.body.appendChild(slashMenu);
          
          // Close the original popover
          const overlay = document.querySelector('.ce-popover__overlay') as HTMLElement;
          if (overlay) {
            overlay.click();
          }
        }
      }, 50);
    }
  }

  function removeSlashMenu() {
    if (slashMenu) {
      slashMenu.remove();
      slashMenu = null;
    }
  }

  holder.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLElement;
    
    // Check if user typed "/"
    if (target.classList.contains('ce-paragraph') || target.classList.contains('ce-header')) {
      const text = target.textContent || '';
      
      // Check if the last character is "/" and it's at the start or after a space
      if (text.endsWith('/') && (text.length === 1 || text[text.length - 2] === ' ')) {
        console.log('Slash detected, showing menu');
        
        // Save cursor position
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        
        // Remove the "/"
        target.textContent = text.slice(0, -1);
        
        // Restore cursor position
        if (range && selection) {
          const newRange = document.createRange();
          newRange.selectNodeContents(target);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        
        // Show inline menu
        createSlashMenu(target);
      }
    }
  });

  holder.addEventListener('keydown', (e: KeyboardEvent) => {
    // Close menu on Escape
    if (e.key === 'Escape') {
      removeSlashMenu();
      return;
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (slashMenu && !slashMenu.contains(e.target as Node)) {
      removeSlashMenu();
    }
  });
}
