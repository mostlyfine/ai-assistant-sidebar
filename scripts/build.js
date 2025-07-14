#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Chrome拡張機能のビルドスクリプト
 * 必要なファイルのみを含む配布用ZIPファイルを作成
 */

// ビルド設定
const BUILD_CONFIG = {
  sourceDir: process.cwd(),
  outputDir: path.join(process.cwd(), 'dist'),
  tempDir: path.join(process.cwd(), 'dist', 'ai-assistant-sidebar'),
  
  // Chrome拡張機能に含めるファイル/ディレクトリ
  includeFiles: [
    'manifest.json',
    'sidepanel.html',
    'background.js',
    'scripts/',
    'styles/',
    'icons/'
  ],
  
  // 除外するファイル（開発用ファイル）
  excludeFiles: [
    'scripts/build.js'
    // セキュリティマネージャーは本番環境でも必要なので除外しない
  ]
};

async function createDirectories() {
  console.log('📁 Creating build directories...');
  
  if (fs.existsSync(BUILD_CONFIG.outputDir)) {
    fs.rmSync(BUILD_CONFIG.outputDir, { recursive: true });
  }
  
  fs.mkdirSync(BUILD_CONFIG.outputDir, { recursive: true });
  fs.mkdirSync(BUILD_CONFIG.tempDir, { recursive: true });
}

async function copyFiles() {
  console.log('📄 Copying extension files...');
  
  for (const file of BUILD_CONFIG.includeFiles) {
    const sourcePath = path.join(BUILD_CONFIG.sourceDir, file);
    const destPath = path.join(BUILD_CONFIG.tempDir, file);
    
    if (fs.existsSync(sourcePath)) {
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        // ディレクトリの場合は再帰的にコピー
        copyDirectory(sourcePath, destPath);
      } else {
        // ファイルの場合はコピー
        fs.copyFileSync(sourcePath, destPath);
      }
      
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ⚠️  ${file} (not found, skipping)`);
    }
  }
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    // 除外ファイルをチェック
    const relativePath = path.relative(BUILD_CONFIG.sourceDir, sourcePath);
    if (BUILD_CONFIG.excludeFiles.includes(relativePath)) {
      console.log(`  🚫 Excluding: ${relativePath}`);
      continue;
    }
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

async function validateExtension() {
  console.log('🔍 Validating extension...');
  
  const manifestPath = path.join(BUILD_CONFIG.tempDir, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found');
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // 必須フィールドのチェック
  const requiredFields = ['manifest_version', 'name', 'version', 'description'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Manifest V3のチェック
  if (manifest.manifest_version !== 3) {
    throw new Error('Only Manifest V3 is supported');
  }
  
  console.log(`  ✅ Extension: ${manifest.name} v${manifest.version}`);
  console.log(`  ✅ Manifest V3 compliant`);
  
  return manifest;
}

async function createZip(manifest) {
  console.log('📦 Creating ZIP package...');
  
  const zipName = `ai-assistant-sidebar-v${manifest.version}.zip`;
  const zipPath = path.join(BUILD_CONFIG.outputDir, zipName);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高圧縮レベル
    });
    
    output.on('close', () => {
      const sizeKB = Math.round(archive.pointer() / 1024);
      console.log(`  ✅ Created: ${zipName} (${sizeKB} KB)`);
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    archive.directory(BUILD_CONFIG.tempDir, false);
    archive.finalize();
  });
}

async function cleanup() {
  console.log('🧹 Cleaning up temporary files...');
  
  if (fs.existsSync(BUILD_CONFIG.tempDir)) {
    fs.rmSync(BUILD_CONFIG.tempDir, { recursive: true });
  }
}

async function main() {
  try {
    console.log('🚀 Building AI Assistant Sidebar Chrome Extension...\n');
    
    await createDirectories();
    await copyFiles();
    const manifest = await validateExtension();
    const zipPath = await createZip(manifest);
    await cleanup();
    
    console.log('\n✨ Build completed successfully!');
    console.log(`📦 Package: ${path.basename(zipPath)}`);
    console.log('\n📋 Installation Instructions:');
    console.log('1. Extract the ZIP file');
    console.log('2. Open Chrome and go to chrome://extensions/');
    console.log('3. Enable "Developer mode"');
    console.log('4. Click "Load unpacked extension"');
    console.log('5. Select the extracted folder');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BUILD_CONFIG, main };