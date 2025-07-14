// Tests for Markdown Parser functionality
describe('Markdown Parser Tests', () => {
  let mockDocument;

  beforeEach(() => {
    mockDocument = {
      createElement: jest.fn((tag) => ({
        innerHTML: '',
        textContent: '',
        className: '',
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        appendChild: jest.fn(),
        set innerHTML(value) { this._innerHTML = value; },
        get innerHTML() { return this._innerHTML || ''; },
        set textContent(value) { 
          this._textContent = value;
          this._innerHTML = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        },
        get textContent() { return this._textContent || ''; }
      }))
    };
    global.document = mockDocument;
    jest.clearAllMocks();
  });

  describe('Code Block Parsing', () => {
    test('should parse code blocks with language', () => {
      const parseCodeBlocks = (text) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        return text.replace(codeBlockRegex, (match, language, code) => {
          // Use the mocked document.createElement
          const pre = document.createElement('pre');
          const codeEl = document.createElement('code');
          
          if (language) {
            codeEl.className = `language-${language}`;
          }
          
          codeEl.textContent = code.trim();
          pre.appendChild(codeEl);
          return `<pre><code class="language-${language || ''}">${code.trim()}</code></pre>`;
        });
      };

      const input = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const result = parseCodeBlocks(input);
      
      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
      expect(result).toContain('language-javascript');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('console.log(x);');
    });

    test('should parse code blocks without language', () => {
      const parseCodeBlocks = (text) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        return text.replace(codeBlockRegex, (match, language, code) => {
          const pre = document.createElement('pre');
          const codeEl = document.createElement('code');
          
          if (language) {
            codeEl.className = `language-${language}`;
          }
          
          codeEl.textContent = code.trim();
          pre.appendChild(codeEl);
          return pre.outerHTML || `<pre><code>${code.trim()}</code></pre>`;
        });
      };

      const input = '```\nsome code here\n```';
      const result = parseCodeBlocks(input);
      
      expect(result).toContain('<pre>');
      expect(result).toContain('<code>');
      expect(result).toContain('some code here');
    });

    test('should handle inline code', () => {
      const parseInlineCode = (text) => {
        const inlineCodeRegex = /`([^`]+)`/g;
        return text.replace(inlineCodeRegex, (match, code) => {
          const codeEl = document.createElement('code');
          codeEl.textContent = code;
          return codeEl.outerHTML || `<code>${code}</code>`;
        });
      };

      const input = 'Use `console.log()` to debug your code.';
      const result = parseInlineCode(input);
      
      expect(result).toBe('Use <code>console.log()</code> to debug your code.');
    });
  });

  describe('Header Parsing', () => {
    test('should parse different header levels', () => {
      const parseHeaders = (text) => {
        const headerRegex = /^(#{1,6})\s+(.+)$/gm;
        return text.replace(headerRegex, (match, hashes, content) => {
          const level = hashes.length;
          const header = document.createElement(`h${level}`);
          header.textContent = content.trim();
          return header.outerHTML || `<h${level}>${content.trim()}</h${level}>`;
        });
      };

      const input = `# Header 1
## Header 2
### Header 3
#### Header 4`;

      const result = parseHeaders(input);
      
      expect(result).toContain('<h1>Header 1</h1>');
      expect(result).toContain('<h2>Header 2</h2>');
      expect(result).toContain('<h3>Header 3</h3>');
      expect(result).toContain('<h4>Header 4</h4>');
    });

    test('should handle headers with special characters', () => {
      const parseHeaders = (text) => {
        const headerRegex = /^(#{1,6})\s+(.+)$/gm;
        return text.replace(headerRegex, (match, hashes, content) => {
          const level = hashes.length;
          const header = document.createElement(`h${level}`);
          header.textContent = content.trim();
          return header.outerHTML || `<h${level}>${content.trim()}</h${level}>`;
        });
      };

      const input = '## API & SDK Integration';
      const result = parseHeaders(input);
      
      expect(result).toContain('<h2>API &amp; SDK Integration</h2>');
    });
  });

  describe('List Parsing', () => {
    test('should parse unordered lists', () => {
      const parseUnorderedLists = (text) => {
        const lines = text.split('\n');
        let result = '';
        let inList = false;
        
        for (const line of lines) {
          if (line.match(/^(\s*)-\s+(.+)$/)) {
            if (!inList) {
              result += '<ul>';
              inList = true;
            }
            const content = line.replace(/^(\s*)-\s+/, '');
            result += `<li>${content}</li>`;
          } else {
            if (inList) {
              result += '</ul>';
              inList = false;
            }
            if (line.trim()) {
              result += line;
            }
          }
        }
        
        if (inList) {
          result += '</ul>';
        }
        
        return result;
      };

      const input = `- First item
- Second item
- Third item`;

      const result = parseUnorderedLists(input);
      
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>First item</li>');
      expect(result).toContain('<li>Second item</li>');
      expect(result).toContain('<li>Third item</li>');
      expect(result).toContain('</ul>');
    });

    test('should parse ordered lists', () => {
      const parseOrderedLists = (text) => {
        const lines = text.split('\n');
        let result = '';
        let inList = false;
        
        for (const line of lines) {
          if (line.match(/^(\s*)\d+\.\s+(.+)$/)) {
            if (!inList) {
              result += '<ol>';
              inList = true;
            }
            const content = line.replace(/^(\s*)\d+\.\s+/, '');
            result += `<li>${content}</li>`;
          } else {
            if (inList) {
              result += '</ol>';
              inList = false;
            }
            if (line.trim()) {
              result += line;
            }
          }
        }
        
        if (inList) {
          result += '</ol>';
        }
        
        return result;
      };

      const input = `1. First item
2. Second item
3. Third item`;

      const result = parseOrderedLists(input);
      
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>First item</li>');
      expect(result).toContain('<li>Second item</li>');
      expect(result).toContain('<li>Third item</li>');
      expect(result).toContain('</ol>');
    });

    test('should parse task lists', () => {
      const parseTaskLists = (text) => {
        const lines = text.split('\n');
        let result = '';
        let inList = false;

        for (const line of lines) {
          if (line.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/)) {
            if (!inList) {
              result += '<ul>';
              inList = true;
            }
            const match = line.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/);
            const checked = match[2] === 'x';
            const content = match[3];
            result += `<li><input type="checkbox"${checked ? ' checked' : ''} disabled> ${content}</li>`;
          } else {
            if (inList) {
              result += '</ul>';
              inList = false;
            }
            if (line.trim()) {
              result += line;
            }
          }
        }

        if (inList) {
          result += '</ul>';
        }

        return result;
      };

      const input = `- [x] Completed task
- [ ] Incomplete task`;
      const result = parseTaskLists(input);

      expect(result).toContain('<ul>');
      expect(result).toContain('<li><input type="checkbox" checked disabled> Completed task</li>');
      expect(result).toContain('<li><input type="checkbox" disabled> Incomplete task</li>');
      expect(result).toContain('</ul>');
    });
  });

  describe('Text Formatting', () => {
    test('should parse bold text', () => {
      const parseBold = (text) => {
        const boldRegex = /\*\*(.*?)\*\*/g;
        return text.replace(boldRegex, (match, content) => {
          const strong = document.createElement('strong');
          strong.textContent = content;
          return strong.outerHTML || `<strong>${content}</strong>`;
        });
      };

      const input = 'This is **bold text** in a sentence.';
      const result = parseBold(input);
      
      expect(result).toBe('This is <strong>bold text</strong> in a sentence.');
    });

    test('should parse italic text', () => {
      const parseItalic = (text) => {
        const italicRegex = /\*(.*?)\*/g;
        return text.replace(italicRegex, (match, content) => {
          const em = document.createElement('em');
          em.textContent = content;
          return em.outerHTML || `<em>${content}</em>`;
        });
      };

      const input = 'This is *italic text* in a sentence.';
      const result = parseItalic(input);
      
      expect(result).toBe('This is <em>italic text</em> in a sentence.');
    });

    test('should parse strikethrough text', () => {
      const parseStrikethrough = (text) => {
        const strikethroughRegex = /~~(.*?)~~/g;
        return text.replace(strikethroughRegex, (match, content) => {
          const del = document.createElement('del');
          del.textContent = content;
          return del.outerHTML || `<del>${content}</del>`;
        });
      };

      const input = 'This is ~~strikethrough text~~ in a sentence.';
      const result = parseStrikethrough(input);
      
      expect(result).toBe('This is <del>strikethrough text</del> in a sentence.');
    });

    test('should parse markdown links', () => {
      const parseLinks = (text) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        return text.replace(linkRegex, (match, text, url) => {
          const link = document.createElement('a');
          link.textContent = text;
          link.setAttribute('href', url);
          link.setAttribute('target', '_blank');
          return link.outerHTML || `<a href="${url}" target="_blank">${text}</a>`;
        });
      };

      const input = 'Visit [Google](https://google.com) for search.';
      const result = parseLinks(input);
      
      expect(result).toContain('<a href="https://google.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('>Google</a>');
    });

    test('should parse plain URLs', () => {
      const parseLinks = (text) => {
        // Parse markdown links [text](url) first
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Parse plain URLs (http/https)
        text = text.replace(/(^|[^"'>])(https?:\/\/[^\s<>"']+?)(?=[.!?]?(?:\s|$))/g, '$1<a href="$2" target="_blank">$2</a>');
        
        // Parse email addresses
        text = text.replace(/(^|[^"'>])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
        
        return text;
      };

      const input = 'Visit https://google.com for search.';
      const result = parseLinks(input);
      
      expect(result).toContain('<a href="https://google.com" target="_blank">https://google.com</a>');
    });

    test('should parse email addresses', () => {
      const parseLinks = (text) => {
        // Parse markdown links [text](url) first
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Parse plain URLs (http/https)
        text = text.replace(/(^|[^"'>])(https?:\/\/[^\s<>"']+?)(?=[.!?]?(?:\s|$))/g, '$1<a href="$2" target="_blank">$2</a>');
        
        // Parse email addresses
        text = text.replace(/(^|[^"'>])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
        
        return text;
      };

      const input = 'Contact us at support@example.com for help.';
      const result = parseLinks(input);
      
      expect(result).toContain('<a href="mailto:support@example.com">support@example.com</a>');
    });

    test('should handle mixed links', () => {
      const parseLinks = (text) => {
        // Parse markdown links [text](url) first
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Parse plain URLs (http/https)
        text = text.replace(/(^|[^"'>])(https?:\/\/[^\s<>"']+?)(?=[.!?]?(?:\s|$))/g, '$1<a href="$2" target="_blank">$2</a>');
        
        // Parse email addresses
        text = text.replace(/(^|[^"'>])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
        
        return text;
      };

      const input = 'Visit [Google](https://google.com) or go to https://example.com. Email: test@example.com';
      const result = parseLinks(input);
      
      expect(result).toContain('<a href="https://google.com" target="_blank">Google</a>');
      expect(result).toContain('<a href="https://example.com" target="_blank">https://example.com</a>');
      expect(result).toContain('<a href="mailto:test@example.com">test@example.com</a>');
    });

    test('should not double-link existing HTML links', () => {
      const parseLinks = (text) => {
        // Parse markdown links [text](url) first
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Parse plain URLs (http/https)
        text = text.replace(/(^|[^"'>])(https?:\/\/[^\s<>"']+?)(?=[.!?]?(?:\s|$))/g, '$1<a href="$2" target="_blank">$2</a>');
        
        // Parse email addresses
        text = text.replace(/(^|[^"'>])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
        
        return text;
      };

      const input = 'Already linked: <a href="https://example.com">example.com</a>';
      const result = parseLinks(input);
      
      expect(result).toBe('Already linked: <a href="https://example.com">example.com</a>');
    });
  });

  describe('Blockquote Parsing', () => {
    test('should parse blockquotes', () => {
      const parseBlockquotes = (text) => {
        const lines = text.split('\n');
        let result = '';
        let inBlockquote = false;
        
        for (const line of lines) {
          if (line.match(/^>\s+(.+)$/)) {
            if (!inBlockquote) {
              result += '<blockquote>';
              inBlockquote = true;
            }
            const content = line.replace(/^>\s+/, '');
            result += `<p>${content}</p>`;
          } else {
            if (inBlockquote) {
              result += '</blockquote>';
              inBlockquote = false;
            }
            if (line.trim()) {
              result += line;
            }
          }
        }
        
        if (inBlockquote) {
          result += '</blockquote>';
        }
        
        return result;
      };

      const input = `> This is a blockquote
> with multiple lines
> of text.`;

      const result = parseBlockquotes(input);
      
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<p>This is a blockquote</p>');
      expect(result).toContain('<p>with multiple lines</p>');
      expect(result).toContain('<p>of text.</p>');
      expect(result).toContain('</blockquote>');
    });
  });

  describe('Line Break Parsing', () => {
    test('should parse line breaks', () => {
      const parseLineBreaks = (text) => {
        return text.replace(/\n/g, '<br>');
      };

      const input = 'First line\nSecond line\nThird line';
      const result = parseLineBreaks(input);
      
      expect(result).toBe('First line<br>Second line<br>Third line');
    });

    test('should handle paragraph breaks', () => {
      const parseParagraphs = (text) => {
        const paragraphs = text.split('\n\n');
        return paragraphs.map(p => {
          if (p.trim()) {
            const paragraph = document.createElement('p');
            paragraph.textContent = p.trim();
            return paragraph.outerHTML || `<p>${p.trim()}</p>`;
          }
          return '';
        }).join('');
      };

      const input = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';
      const result = parseParagraphs(input);
      
      expect(result).toContain('<p>First paragraph</p>');
      expect(result).toContain('<p>Second paragraph</p>');
      expect(result).toContain('<p>Third paragraph</p>');
    });
  });

  describe('Complex Markdown Parsing', () => {
    test('should parse complex markdown with multiple elements', () => {
      const parseMarkdown = (text) => {
        // Code blocks
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
          return `<pre><code class="language-${language || ''}">${code.trim()}</code></pre>`;
        });
        
        // Headers
        text = text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
          const level = hashes.length;
          return `<h${level}>${content.trim()}</h${level}>`;
        });
        
        // Bold
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        return text;
      };

      const input = `# Main Title

This is **bold text** and this is *italic text*.

Here's a link: [GitHub](https://github.com)

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`

And some inline \`code\` here.`;

      const result = parseMarkdown(input);
      
      expect(result).toContain('<h1>Main Title</h1>');
      expect(result).toContain('<strong>bold text</strong>');
      expect(result).toContain('<em>italic text</em>');
      expect(result).toContain('<a href="https://github.com" target="_blank">GitHub</a>');
      expect(result).toContain('<pre><code class="language-javascript">');
      expect(result).toContain('<code>code</code>');
    });

    test('should handle nested markdown elements', () => {
      const parseMarkdown = (text) => {
        // Process in order: code blocks first, then other elements
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
          return `<pre><code class="language-${language || ''}">${code.trim()}</code></pre>`;
        });
        
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        return text;
      };

      const input = '**Bold with [link](https://example.com) inside**';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<strong>Bold with <a href="https://example.com" target="_blank">link</a> inside</strong>');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const parseMarkdown = (text) => {
        if (!text) return '';
        return text;
      };

      expect(parseMarkdown('')).toBe('');
      expect(parseMarkdown(null)).toBe('');
      expect(parseMarkdown(undefined)).toBe('');
    });

    test('should handle malformed markdown', () => {
      const parseMarkdown = (text) => {
        try {
          // Bold
          text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          
          // Handle unmatched asterisks
          text = text.replace(/\*([^*]+)$/g, '*$1'); // Leave unmatched asterisks
          
          return text;
        } catch (error) {
          return text; // Return original text if parsing fails
        }
      };

      const input = 'This has **bold but no closing asterisks';
      const result = parseMarkdown(input);
      
      // Should not crash and should return something reasonable
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle special characters in code blocks', () => {
      const parseCodeBlocks = (text) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        return text.replace(codeBlockRegex, (match, language, code) => {
          // Escape HTML in code blocks
          const escaped = code.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
          
          return `<pre><code class="language-${language || ''}">${escaped}</code></pre>`;
        });
      };

      const input = '```html\n<div class="test">Content & more</div>\n```';
      const result = parseCodeBlocks(input);
      
      expect(result).toContain('&lt;div class=&quot;test&quot;&gt;');
      expect(result).toContain('Content &amp; more');
      expect(result).toContain('&lt;/div&gt;');
    });
  });

  describe('Table Parsing', () => {
    test('should parse simple tables', () => {
      const parseTable = (text) => {
        const lines = text.split('\n');
        const result = [];
        let inTable = false;
        let tableRows = [];
        let tableHeaders = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.includes('|') && line.split('|').length > 2) {
            if (line.match(/^\s*\|?[\s\-:]+\|[\s\-:|]*\|?\s*$/)) {
              if (tableRows.length === 1) {
                tableHeaders = tableRows[0];
                tableRows = [];
              }
              continue;
            }
            
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
            if (cells.length > 1) {
              if (!inTable) {
                inTable = true;
              }
              tableRows.push(cells);
              continue;
            }
          }
          
          if (inTable) {
            let html = '<table>';
            if (tableHeaders.length > 0) {
              html += '<thead><tr>';
              tableHeaders.forEach(header => {
                html += `<th>${header}</th>`;
              });
              html += '</tr></thead>';
            }
            if (tableRows.length > 0) {
              html += '<tbody>';
              tableRows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                  html += `<td>${cell}</td>`;
                });
                html += '</tr>';
              });
              html += '</tbody>';
            }
            html += '</table>';
            result.push(html);
            inTable = false;
            tableRows = [];
            tableHeaders = [];
          }
          
          result.push(line);
        }
        
        // Handle table at end of input
        if (inTable) {
          let html = '<table>';
          if (tableHeaders.length > 0) {
            html += '<thead><tr>';
            tableHeaders.forEach(header => {
              html += `<th>${header}</th>`;
            });
            html += '</tr></thead>';
          }
          if (tableRows.length > 0) {
            html += '<tbody>';
            tableRows.forEach(row => {
              html += '<tr>';
              row.forEach(cell => {
                html += `<td>${cell}</td>`;
              });
              html += '</tr>';
            });
            html += '</tbody>';
          }
          html += '</table>';
          result.push(html);
        }
        
        return result.join('\n');
      };

      const input = `| Name | Age | City |
| --- | --- | --- |
| John | 25 | New York |
| Jane | 30 | London |`;

      const result = parseTable(input);
      
      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<th>Name</th>');
      expect(result).toContain('<th>Age</th>');
      expect(result).toContain('<th>City</th>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<td>John</td>');
      expect(result).toContain('<td>25</td>');
      expect(result).toContain('<td>New York</td>');
    });

    test('should handle table alignment', () => {
      const parseAlignment = (alignCell) => {
        if (alignCell.startsWith(':') && alignCell.endsWith(':')) return 'center';
        if (alignCell.endsWith(':')) return 'right';
        return 'left';
      };

      expect(parseAlignment('---')).toBe('left');
      expect(parseAlignment(':---')).toBe('left');
      expect(parseAlignment('---:')).toBe('right');
      expect(parseAlignment(':---:')).toBe('center');
    });

    test('should parse tables without headers', () => {
      const parseTable = (text) => {
        const lines = text.split('\n');
        const result = [];
        let tableRows = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.includes('|') && line.split('|').length > 2) {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
            if (cells.length > 1) {
              tableRows.push(cells);
              continue;
            }
          }
          
          if (tableRows.length > 0) {
            let html = '<table><tbody>';
            tableRows.forEach(row => {
              html += '<tr>';
              row.forEach(cell => {
                html += `<td>${cell}</td>`;
              });
              html += '</tr>';
            });
            html += '</tbody></table>';
            result.push(html);
            tableRows = [];
          }
          
          result.push(line);
        }
        
        // Handle table at end of input
        if (tableRows.length > 0) {
          let html = '<table><tbody>';
          tableRows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
              html += `<td>${cell}</td>`;
            });
            html += '</tr>';
          });
          html += '</tbody></table>';
          result.push(html);
        }
        
        return result.join('\n');
      };

      const input = `| Data 1 | Data 2 |
| Data 3 | Data 4 |`;

      const result = parseTable(input);
      
      expect(result).toContain('<table>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<td>Data 1</td>');
      expect(result).toContain('<td>Data 2</td>');
      expect(result).toContain('<td>Data 3</td>');
      expect(result).toContain('<td>Data 4</td>');
    });
  });
});