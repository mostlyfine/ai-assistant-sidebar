# Changelog

All notable changes to the AI Assistant Sidebar Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2025-08-17

### 🔒 Security
- Enhanced security management with comprehensive test coverage
- Added proactive permission checking for page content integration

### 🧪 Testing
- Expanded test suite with improved source code validation
- Added comprehensive security testing for API credentials
- Enhanced integration testing for all AI providers
- Improved test file organization and cleanup

### 📚 Documentation  
- Updated file structure documentation to reflect current codebase
- Enhanced test documentation with detailed coverage information
- Improved development command documentation

### 🐛 Bug Fixes
- Fixed test file list accuracy after codebase cleanup
- Improved ping message handling in content script

## [1.0.3] - 2025-08-04

### ✨ Features
- Improved permission error handling to display user-friendly messages (b319c0c).

### 🔒 Security
- Updated `form-data` to fix a critical vulnerability (a543f03).
- Removed `all_sites` permission to minimize security risks (9136f99).

## [1.0.2] - 2025-07-20

### Added
- Conversation history persistence functionality
- Improved UI components and user experience
- Enhanced chat interface with better user interaction

### Fixed
- Fixed typo in .gitignore file
- Resolved various configuration issues

### Improved
- UI/UX improvements for better user experience
- Code cleanup and optimization

## [1.0.1] - 2025-07-19

### Added
- Enhanced HTML structure improvements
- Expanded AWS Bedrock model selection support
- Better model compatibility across different providers

### Fixed
- Removed unnecessary console logs for cleaner code
- Improved debugging and development experience

### Security
- Enhanced AWS Bedrock API authentication system
- Improved security validation and error handling
- Strengthened API authentication mechanisms

### Changed
- Updated .gitignore configurations
- Cleaned up Claude configuration files
- Optimized GitHub Actions workflows
- Improved security checks to focus on actual values only
- Enhanced configuration validation features

## [1.0.0] - 2025-07-18

### Added
- **Multi-AI Integration**: Complete support for 4 major AI providers
  - Google Vertex AI (Gemini models)
  - OpenAI Compatible APIs (7 providers including OpenAI, Azure OpenAI, Anthropic, Groq, DeepSeek, Ollama, Custom)
  - ChatGPT API
  - AWS Bedrock (13+ models including Claude, Titan, Command R, Llama)

- **Modern Chat Interface**
  - Bubble-style message design with animations
  - Full Markdown support with marked.js v16.0.0
  - Responsive input area with drag-to-resize functionality
  - Timestamp display for all messages
  - AI provider identification in chat messages

- **Comprehensive Security System**
  - AES-GCM encryption for all API credentials
  - Secure storage using Chrome Storage API
  - Input validation and integrity checks
  - Automatic migration from plaintext to encrypted storage

- **Internationalization (i18n)**
  - Full Japanese and English language support
  - Dynamic language switching
  - Automatic browser language detection
  - Comprehensive UI text localization

- **Page Content Integration**
  - Automatic content script injection
  - Page text extraction with 8,000 character limit
  - Selected text capture functionality
  - Optional page content inclusion in messages

- **Advanced Configuration System**
  - Tabbed settings interface (5 tabs)
  - Custom instruction support for all AI providers
  - Default provider selection
  - Font size customization (8pt-24pt)
  - Persistent settings storage

- **API-Specific Features**
  - **Vertex AI**: Service Account JWT authentication, multiple model support
  - **OpenAI Compatible**: Unified interface for 7 providers with preset configurations
  - **ChatGPT**: Bearer token authentication with Organization ID support
  - **AWS Bedrock**: Full AWS Signature V4 authentication implementation

- **Testing Infrastructure**
  - Comprehensive unit test suite (112 test cases)
  - API integration testing
  - Security validation tests
  - Internationalization testing
  - CI/CD pipeline with GitHub Actions

- **Chrome Extension Features**
  - Manifest V3 compliance
  - Side panel API integration
  - Content script auto-injection
  - Background service worker
  - Cross-origin request handling

### Technical Implementation
- **Architecture**: Modular design with separated concerns
- **Security**: Industry-standard encryption and authentication
- **Performance**: Optimized API calls and efficient UI updates
- **Compatibility**: Chrome 114+ support with Manifest V3
- **Testing**: 100% test pass rate with comprehensive coverage

### Supported Models
- **Vertex AI**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash-002, and more
- **OpenAI**: GPT-4o, GPT-4, GPT-3.5-turbo series
- **Azure OpenAI**: Custom deployment support
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku/Sonnet/Opus
- **AWS Bedrock**: Claude 3.5 Sonnet v2/v1, Titan Text, Command R+/R, Llama 3.2 series
- **Other providers**: Groq, DeepSeek, Ollama local models

### File Structure
```
├── manifest.json              # Chrome extension configuration
├── background.js              # Service worker for side panel control
├── sidepanel.html            # Main tabbed interface
├── styles/sidepanel.css      # Modern UI styling
├── scripts/
│   ├── sidepanel.js          # AIAssistant class and main logic
│   ├── openai-compatible.js  # Unified OpenAI-compatible API integration
│   ├── chatgpt-api.js        # ChatGPT API integration
│   ├── aws-bedrock.js        # AWS Bedrock with Signature V4 auth
│   ├── security-manager.js   # AES-GCM encryption system
│   ├── i18n.js               # Internationalization system
│   ├── content.js            # Page content extraction
│   └── crypto-utils.js       # JWT and OAuth utilities
└── tests/                    # Comprehensive test suite
```
