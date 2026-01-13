/**
 * Web Component for displaying webmentions
 * Reads from webmentions.json and displays webmentions for the current page
 */
class WebmentionsDisplay extends HTMLElement {
  constructor() {
    super();
    this.webmentions = [];
    this.currentUrl = null;
  }

  connectedCallback() {
    // Get the current page URL
    this.currentUrl = window.location.href.split('?')[0].split('#')[0];
    
    // Load webmentions
    this.loadWebmentions();
  }

  async loadWebmentions() {
    try {
      // Try to load from the static file first
      const response = await fetch('/webmentions.json');
      
      if (!response.ok) {
        // If file doesn't exist or fails, try the API endpoint
        return this.loadFromAPI();
      }

      const data = await response.json();
      this.processWebmentions(data);
    } catch (error) {
      console.log('Could not load webmentions from file, trying API:', error);
      // Fallback to API endpoint
      this.loadFromAPI();
    }
  }

  async loadFromAPI() {
    try {
      const response = await fetch(`/.netlify/functions/webmention?target=${encodeURIComponent(this.currentUrl)}`);
      
      if (!response.ok) {
        this.renderEmpty();
        return;
      }

      const data = await response.json();
      this.webmentions = data.webmentions || [];
      this.render();
    } catch (error) {
      console.error('Error loading webmentions:', error);
      this.renderEmpty();
    }
  }

  processWebmentions(data) {
    // Find webmentions for the current URL
    // The data structure is: { "https://kaiapeacock.com/blog/post": [...] }
    this.webmentions = data[this.currentUrl] || [];
    this.render();
  }

  render() {
    if (this.webmentions.length === 0) {
      this.renderEmpty();
      return;
    }

    const container = document.createElement('div');
    container.className = 'webmentions-container';

    const heading = document.createElement('h2');
    heading.className = 'webmentions-heading';
    heading.textContent = `Webmentions (${this.webmentions.length})`;
    container.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'webmentions-list';

    this.webmentions.forEach(webmention => {
      const item = document.createElement('li');
      item.className = 'webmention-item';

      const link = document.createElement('a');
      link.href = webmention.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'webmention-source';

      const title = webmention.title || new URL(webmention.source).hostname;
      link.textContent = title;

      const meta = document.createElement('div');
      meta.className = 'webmention-meta';

      if (webmention.author) {
        const author = document.createElement('span');
        author.className = 'webmention-author';
        author.textContent = `by ${webmention.author}`;
        meta.appendChild(author);
      }

      if (webmention.received) {
        const date = document.createElement('time');
        date.className = 'webmention-date';
        date.dateTime = webmention.received;
        date.textContent = new Date(webmention.received).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        if (meta.children.length > 0) {
          meta.appendChild(document.createTextNode(' • '));
        }
        meta.appendChild(date);
      }

      item.appendChild(link);
      if (meta.children.length > 0) {
        item.appendChild(meta);
      }
      list.appendChild(item);
    });

    container.appendChild(list);
    this.innerHTML = '';
    this.appendChild(container);
  }

  renderEmpty() {
    // Don't render anything if there are no webmentions
    this.style.display = 'none';
  }
}

// Register the custom element
customElements.define('webmentions-display', WebmentionsDisplay);
