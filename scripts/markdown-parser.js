class MarkdownParser {
  static parse(text) {
    // HTML escape
    text = this.escapeHtml(text);
    
    // Process code blocks (```) first
    text = this.parseCodeBlocks(text);
    
    // Inline code (`)
    text = this.parseInlineCode(text);
    
    // Headings
    text = this.parseHeaders(text);
    
    // Bold, italic, and strikethrough
    text = this.parseTextFormatting(text);
    
    // Lists
    text = this.parseLists(text);
    
    // Blockquotes
    text = this.parseBlockquotes(text);
    
    // Tables
    text = this.parseTables(text);
    
    // Links
    text = this.parseLinks(text);
    
    // Line break processing
    text = this.parseLineBreaks(text);
    
    return text;
  }

  static escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    // SecurityManagerが利用できる場合はより強力なサニタイゼーションを使用
    if (window.securityManager && window.securityManager.sanitizeHTML) {
      return window.securityManager.sanitizeHTML(text);
    }
    
    // フォールバック: 基本的なHTMLエスケープ
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static parseCodeBlocks(text) {
    // Code block surrounded by ```
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || '';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });
  }

  static parseInlineCode(text) {
    // Inline code surrounded by `
    return text.replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  static parseHeaders(text) {
    // # ## ### Headings
    return text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content}</h${level}>`;
    });
  }

  static parseTextFormatting(text) {
    // Strikethrough, Bold, and Italic
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return text;
  }

  static parseLists(text) {
    // Split lines and process
    const lines = text.split('\n');
    const result = [];
    const listStack = []; // Stack to track nested lists
    let currentIndentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Calculate indentation level
      const indent = line.match(/^(\s*)/)[1].length;
      
      // Numbered lists with nesting support
      const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (orderedMatch) {
        const listIndent = orderedMatch[1].length;
        const content = orderedMatch[3];
        
        this.adjustListStack(result, listStack, listIndent, 'ol');
        
        let listItemContent = content;
        const taskListMatch = listItemContent.match(/^\s*\[([ x])\]\s+(.*)$/s);
        if (taskListMatch) {
          const checked = taskListMatch[1].toLowerCase() === 'x';
          const label = taskListMatch[2];
          listItemContent = `<input type="checkbox" disabled${checked ? ' checked' : ''}> ${label}`;
        }
        
        result.push(`<li>${listItemContent}</li>`);
        continue;
      }
      
      // Bullet lists (and task lists) with nesting support
      const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (unorderedMatch) {
        const listIndent = unorderedMatch[1].length;
        const content = unorderedMatch[2];
        
        this.adjustListStack(result, listStack, listIndent, 'ul');
        
        let listItemContent = content;
        const taskListMatch = listItemContent.match(/^\s*\[([ x])\]\s+(.*)$/s);
        if (taskListMatch) {
          const checked = taskListMatch[1].toLowerCase() === 'x';
          const label = taskListMatch[2];
          listItemContent = `<input type="checkbox" disabled${checked ? ' checked' : ''}> ${label}`;
        }
        
        result.push(`<li>${listItemContent}</li>`);
        continue;
      }
      
      // Non-list lines - close all lists
      this.closeAllLists(result, listStack);
      result.push(line);
    }
    
    // Close any remaining lists at the end
    this.closeAllLists(result, listStack);
    
    return result.join('\n');
  }

  static adjustListStack(result, listStack, currentIndent, listType) {
    // Close deeper lists
    while (listStack.length > 0 && listStack[listStack.length - 1].indent >= currentIndent) {
      const closedList = listStack.pop();
      result.push(`</${closedList.type}>`);
    }
    
    // Open new list if needed
    if (listStack.length === 0 || listStack[listStack.length - 1].indent < currentIndent) {
      result.push(`<${listType}>`);
      listStack.push({ type: listType, indent: currentIndent });
    }
  }

  static closeAllLists(result, listStack) {
    while (listStack.length > 0) {
      const closedList = listStack.pop();
      result.push(`</${closedList.type}>`);
    }
  }

  static parseBlockquotes(text) {
    const lines = text.split('\n');
    const result = [];
    let inBlockquote = false;
    let blockquoteContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for blockquote lines (starting with >)
      const blockquoteMatch = line.match(/^>\s?(.*)$/);
      if (blockquoteMatch) {
        if (!inBlockquote) {
          inBlockquote = true;
          blockquoteContent = [];
        }
        blockquoteContent.push(blockquoteMatch[1]);
        continue;
      }
      
      // Empty line within blockquote
      if (inBlockquote && line.trim() === '') {
        blockquoteContent.push('');
        continue;
      }
      
      // Non-blockquote line
      if (inBlockquote) {
        // Process the blockquote content
        const blockquoteText = blockquoteContent.join('\n');
        const processedBlockquote = this.processBlockquoteContent(blockquoteText);
        result.push(`<blockquote>${processedBlockquote}</blockquote>`);
        inBlockquote = false;
        blockquoteContent = [];
      }
      
      result.push(line);
    }
    
    // Handle blockquote at end of text
    if (inBlockquote) {
      const blockquoteText = blockquoteContent.join('\n');
      const processedBlockquote = this.processBlockquoteContent(blockquoteText);
      result.push(`<blockquote>${processedBlockquote}</blockquote>`);
    }
    
    return result.join('\n');
  }

  static processBlockquoteContent(text) {
    // Split into paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(paragraph => {
      // Convert single line breaks to <br>
      const withBreaks = paragraph.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    }).join('');
  }

  static parseTables(text) {
    // Split into lines for table processing
    const lines = text.split('\n');
    const result = [];
    let inTable = false;
    let tableRows = [];
    let tableHeaders = [];
    let tableAlignments = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line contains pipe characters (potential table row)
      if (line.includes('|') && line.split('|').length > 2) {
        // Check if this is a header separator line (contains dashes)
        if (line.match(/^\s*\|?[\s\-:]+\|[\s\-:|]*\|?\s*$/)) {
          // This is a header separator line
          if (tableRows.length === 1) {
            // Previous line was header
            tableHeaders = tableRows[0];
            tableRows = [];
            
            // Parse alignments
            const alignCells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
            tableAlignments = alignCells.map(cell => {
              if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
              if (cell.endsWith(':')) return 'right';
              return 'left';
            });
          }
          continue;
        }
        
        // Regular table row
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          if (!inTable) {
            inTable = true;
          }
          tableRows.push(cells);
          continue;
        }
      }
      
      // Not a table line - output any accumulated table
      if (inTable) {
        result.push(this.buildTableHtml(tableHeaders, tableRows, tableAlignments));
        inTable = false;
        tableRows = [];
        tableHeaders = [];
        tableAlignments = [];
      }
      
      result.push(line);
    }
    
    // Handle table at end of text
    if (inTable) {
      result.push(this.buildTableHtml(tableHeaders, tableRows, tableAlignments));
    }
    
    return result.join('\n');
  }

  static buildTableHtml(headers, rows, alignments) {
    let html = '<table>';
    
    // Build header
    if (headers.length > 0) {
      html += '<thead><tr>';
      headers.forEach((header, index) => {
        const align = alignments[index] || 'left';
        const alignAttr = align !== 'left' ? ` style="text-align: ${align}"` : '';
        html += `<th${alignAttr}>${header}</th>`;
      });
      html += '</tr></thead>';
    }
    
    // Build body
    if (rows.length > 0) {
      html += '<tbody>';
      rows.forEach(row => {
        html += '<tr>';
        row.forEach((cell, index) => {
          const align = alignments[index] || 'left';
          const alignAttr = align !== 'left' ? ` style="text-align: ${align}"` : '';
          html += `<td${alignAttr}>${cell}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    
    html += '</table>';
    return html;
  }

  static parseLinks(text) {
    // Parse markdown links [text](url) first
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Parse plain URLs (http/https)
    text = text.replace(/(^|[^"'>])(https?:\/\/[^\s<>"',!?]+)(?=[.!?:,]?(?:\s|$))/g, '$1<a href="$2" target="_blank">$2</a>');
    
    // Parse email addresses
    text = text.replace(/(^|[^"'>])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
    
    return text;
  }

  static parseLineBreaks(text) {
    // Paragraph breaks
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(p => {
      // Keep as is if already surrounded by HTML tags
      if (p.match(/^<(h[1-6]|pre|ul|ol|blockquote)/)) {
        return p;
      }
      // Convert line breaks to <br>
      const withBreaks = p.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    }).join('');
  }
}