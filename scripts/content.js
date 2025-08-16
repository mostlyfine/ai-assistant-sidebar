// Content Script - Read page content
class PageContentReader {
  static extractPageContent() {
    const selectedText = this.getSelectedText();
    const content = {
      title: document.title,
      url: window.location.href,
      text: this.extractMainText(),
      selectedText: selectedText,
      hasSelection: selectedText.length > 0,
      metadata: this.extractMetadata()
    };
    return content;
  }

  static extractMainText() {
    // Extract main text excluding unnecessary elements
    const excludeSelectors = [
      'script', 'style', 'nav', 'footer', 'header', 
      '.advertisement', '.ads', '.sidebar', '.menu',
      '[aria-hidden="true"]', '.hidden'
    ];
    
    // Identify main content area
    const mainSelectors = [
      'main', 'article', '[role="main"]', '.content', 
      '.post', '.entry', '#content', '#main'
    ];
    
    let mainElement = null;
    for (const selector of mainSelectors) {
      mainElement = document.querySelector(selector);
      if (mainElement) break;
    }
    
    // Use body if main area not found
    if (!mainElement) {
      mainElement = document.body;
    }
    
    // Create clone with excluded elements removed
    const clone = mainElement.cloneNode(true);
    excludeSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Extract and format text
    let text = clone.textContent || clone.innerText || '';
    text = text.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    if (text.length > 50000) {
      text = text.substring(0, 50000) + '...';
    }
    
    return text;
  }

  static getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  static extractMetadata() {
    const metadata = {};
    
    // Get meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        metadata[name] = content;
      }
    });
    
    // Get headings
    const headings = [];
    document.querySelectorAll('h1, h2, h3').forEach(heading => {
      if (headings.length < 10) { // Maximum 10 items
        headings.push({
          level: heading.tagName.toLowerCase(),
          text: heading.textContent.trim()
        });
      }
    });
    metadata.headings = headings;
    
    return metadata;
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageContent') {
    try {
      const content = PageContentReader.extractPageContent();
      sendResponse({ success: true, content });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  } else if (message.action === 'ping') {
    sendResponse({ success: true });
  }
  return true; // Indicates async response
});