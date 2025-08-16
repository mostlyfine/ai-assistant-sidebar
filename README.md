# Multi-AI Assistant Chrome Extension

A comprehensive Chrome extension that integrates multiple AI providers in a convenient sidebar interface. Chat with Vertex AI, OpenAI Compatible APIs, ChatGPT, and AWS Bedrock from any web page.

## Features

### 🤖 Multi-AI Integration
- **Vertex AI**: Google's Gemini models with Service Account or API Key authentication
- **OpenAI Compatible**: Unified interface supporting 7 providers (OpenAI, Azure OpenAI, Anthropic, Groq, DeepSeek, Ollama, Custom)
- **ChatGPT**: Direct OpenAI API integration with organization support
- **AWS Bedrock**: 13 supported models with AWS Signature V4 authentication

### 💬 Modern Chat Interface
- **Bubble Design**: Clean, modern chat interface with user (right, blue) and AI (left, white) messages
- **AI Identification**: Each AI response shows provider name and icon in timestamp
- **Markdown Support**: marked.js v16.0.0 with full GFM (GitHub Flavored Markdown) support
- **Animations**: Smooth slide-in effects for new messages
- **Resizable Input**: Drag-to-resize input area for longer messages
- **Custom Instructions**: Global system prompts applied to all AI providers
- **Scrollable Content**: Smooth scrolling for long conversations with custom scrollbar styling
- **Flexible Font Size**: Adjustable font size from 8pt to 24pt with 12pt default
- **Unified Font**: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif

### 🌐 Internationalization
- **Bilingual Support**: Complete Japanese and English localization
- **Dynamic Language Switching**: Change language in settings without restart
- **Auto-detection**: Automatically detects browser language preference
- **Comprehensive Coverage**: All UI elements, placeholders, and messages localized

### 📄 Page Content Integration
- **Smart Content Extraction**: Automatically extracts page title, headings, and main content
- **Selected Text Support**: Include highlighted text in AI conversations
- **Content Script**: Dynamic injection for compatibility with all websites
- **Configurable Options**: Toggle page content and selected text inclusion

### 🔒 Security Features
- **Encrypted Storage**: AES-GCM encryption for API credentials and sensitive data
- **SecurityManager**: Comprehensive security management with input validation
- **Secure Migration**: Automatic migration from plain text to encrypted storage
- **Access Control**: Proper Chrome extension permissions and security boundaries

### ⚙️ Advanced Configuration
- **Tabbed Settings**: Organized 5-tab configuration interface
- **Provider Presets**: Pre-configured settings for popular AI services
- **Persistent Storage**: Chrome Storage API for reliable settings persistence
- **CI/CD Pipeline**: Automated testing, building, and deployment with GitHub Actions

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. Select the project folder

## Setup Guide

### Vertex AI Configuration
1. Create a Google Cloud project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Vertex AI API
3. Create a Service Account:
   - Go to IAM & Admin → Service Accounts → Create Service Account
   - Assign "Vertex AI User" role
   - Create and download JSON key
4. In extension settings, upload JSON file, select location and model

### OpenAI Compatible Setup

#### OpenAI
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Select "OpenAI" preset (auto-configures endpoint)
3. Enter API key and select model

#### Azure OpenAI
1. Create Azure OpenAI Service resource
2. Get API key and endpoint from Azure portal
3. Deploy a model (e.g., gpt-4)
4. Select "Azure OpenAI" preset
5. Configure endpoint, API key, API version, and deployment name

#### Other Providers
- **Anthropic**: Use Claude API key
- **Groq**: Use Groq API key
- **DeepSeek**: Use DeepSeek API key
- **Ollama**: Local server (localhost:11434)
- **Custom**: Any OpenAI Compatible API

### ChatGPT Configuration
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Enter API key and select model
3. Add Organization ID if using organization account

### AWS Bedrock Configuration
1. Enable AWS Bedrock service in your AWS account
2. Create IAM user or role with Bedrock permissions
3. Generate Access Key ID and Secret Access Key
4. Configure credentials, region, and model in extension settings
5. Add Session Token if using temporary credentials (STS)

## File Structure

```
gemini-plugin/
├── manifest.json             # Chrome extension configuration (Manifest V3)
├── background.js             # Service worker for sidepanel control
├── sidepanel.html            # Main HTML with tabbed settings and chat interface
├── styles/
│   └── sidepanel.css         # Styling for multi-AI interface and modern chat UI
├── scripts/
│   ├── content.js            # Content script for page content extraction
│   ├── crypto-utils.js       # JWT generation and OAuth authentication (Vertex AI)
│   ├── marked.min.js         # Markdown parser (marked.js v16.0.0)
│   ├── dompurify.min.js      # HTML sanitizer (DOMPurify)
│   ├── openai-compatible.js  # OpenAI Compatible API integration (7 providers)
│   ├── aws-bedrock.js        # AWS Bedrock API integration with Signature V4
│   ├── i18n.js               # Internationalization system (Japanese/English)
│   ├── security-manager.js   # AES-GCM encryption for secure credential storage
│   ├── build.js              # Build script for Chrome extension packaging
│   └── sidepanel.js          # Main AI assistant class and UI control
├── tests/
│   ├── setup.js              # Test environment configuration
│   └── unit/                 # Unit test files
│       ├── ai-assistant.test.js      # AIAssistant class tests
│       ├── api-integrations.test.js  # API integration tests
│       ├── i18n.test.js              # Internationalization tests
│       ├── integration.test.js       # End-to-end integration tests
│       ├── source-code-validation.test.js  # Code quality & security tests
│       └── utility-functions.test.js       # Utility function tests
└── icons/                    # Extension icons (16/32/48/128px)
```

## Supported Models

### Vertex AI
- gemini-2.5-pro, gemini-2.5-flash
- gemini-2.0-flash, gemini-2.0-flash-exp
- gemini-1.5-flash-002, gemini-1.5-pro-002
- And more Gemini models

### OpenAI Compatible
- **OpenAI**: GPT-4o, GPT-4, GPT-3.5-turbo series
- **Azure OpenAI**: Custom deployment support
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku/Sonnet/Opus
- **Groq**: Llama 3.1, Mixtral, Gemma models
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **Ollama**: Local LLM support
- **Custom**: Any OpenAI Compatible API

### ChatGPT
- GPT-4o, GPT-4o mini, GPT-4, GPT-4 Turbo, GPT-3.5 Turbo

### AWS Bedrock
- Claude 3.5 Sonnet v2/v1, Claude 3 Haiku/Sonnet/Opus
- Amazon Titan Text Premier/Express
- Cohere Command R+/R
- Meta Llama 3.2 series (90B, 11B, 3B, 1B Instruct)

## Development

### Testing the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Reload" after making changes
4. Use DevTools to debug sidepanel (right-click → Inspect)

### Running Tests
```bash
npm test              # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Test Suite
- **107 Unit Tests**: Complete test coverage for all major components
- **API Integration Tests**: Tests for all AI provider integrations
- **Internationalization Tests**: Japanese/English localization validation
- **Security Tests**: Code quality and security validation
- **Integration Tests**: End-to-end workflow testing

### Key Components

#### AIAssistant Class (scripts/sidepanel.js)
- Multi-AI management for 4 providers
- Chrome Storage API for persistent settings
- Tabbed configuration interface
- Modern chat UI with animations
- Internationalization support

#### API Integration Classes
- **OpenAI Compatible**: Unified interface for 7 providers
- **ChatGPT**: Direct OpenAI API with organization support
- **AWS Bedrock**: Signature V4 authentication
- **Vertex AI**: JWT → OAuth 2.0 flow

#### Content Script (scripts/content.js)
- Page content extraction
- Selected text capture
- Dynamic injection support

#### Security Manager (scripts/security-manager.js)
- AES-GCM encryption for sensitive data
- Input validation and sanitization
- Secure migration from plain text storage
- Web Crypto API integration

#### Internationalization (scripts/i18n.js)
- Bilingual support (Japanese/English)
- Browser language detection
- Dynamic text replacement

### Chrome Extension Features
- **Manifest V3**: Modern extension architecture
- **Side Panel API**: Chrome 114+ sidebar integration
- **Content Scripts**: Dynamic page content access
- **Storage API**: Persistent configuration storage
- **Permissions**: Secure API access controls

## Security Considerations

- **AES-GCM Encryption**: API credentials encrypted using Web Crypto API
- **SecurityManager**: Comprehensive security management with input validation
- **Secure Migration**: Automatic migration from plain text to encrypted storage
- **Access Control**: Chrome extension permissions and security boundaries
- **Best Practices**: Service Account keys require minimum necessary permissions
- **Monitoring**: Regular API key rotation and usage monitoring recommended

## Browser Compatibility

- Chrome 114+ (Side Panel API requirement)
- Edge 114+ (Chromium-based)
- Other Chromium browsers with Side Panel support

## License

BSD 3-Clause License

Copyright (c) 2024, AI Assistant Sidebar
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the DevTools console for error messages
- Verify API credentials and permissions
- Ensure Chrome version 114 or higher
- Test with different AI providers to isolate issues

## Quality Assurance

### Comprehensive Test Suite
- **107 Unit Tests**: 100% pass rate with comprehensive coverage
- **API Integration Testing**: All AI providers validated
- **Security Testing**: Code quality and vulnerability scanning
- **Internationalization Testing**: Complete Japanese/English validation
- **Cross-browser Testing**: Chrome 114+ compatibility verified

### Test Categories
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: End-to-end workflow validation
3. **Security Tests**: Credential safety and data protection
4. **Performance Tests**: Memory management and API throttling
5. **Accessibility Tests**: UI/UX compliance verification
6. **Library Integration**: External library compatibility and security

### Continuous Quality Monitoring
- Automated test execution on code changes
- Code coverage reporting
- Security vulnerability scanning
- Performance regression detection

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and building
- **Artifact Management**: 90-day retention for build artifacts
- **Release Automation**: Automatic Chrome extension packaging
- **Security Scanning**: API key detection and vulnerability checks
- **Quality Gates**: All tests must pass before deployment

## Roadmap

- [ ] Chat history persistence per AI provider
- [ ] Dark mode support
- [ ] Additional language support
- [ ] File upload capabilities
- [ ] Streaming response support
- [ ] Chat export functionality
- [ ] E2E testing implementation
- [ ] Performance optimization
- [ ] Advanced security features