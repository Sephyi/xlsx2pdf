#!/usr/bin/env bun

/**
 * TypeScript build script for XLSX2PDF
 * Detects platform and builds an executable accordingly
 * Uses Bun native APIs where possible
 */

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

// Type definitions
type Platform = 'win32' | 'darwin' | 'linux' | string;

interface BuildConfig {
  outputFile: string;
  buildArgs: string[];
  postBuildCommands?: Array<string[]>;
}

declare global {
  interface Crypto {
    randomUUID(): string;
  }
  namespace Bun {
    interface SpawnOptions { }
  }
}


/**
 * Log messages to console with timestamp
 */
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[34m',    // Blue
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m',    // Reset
  };

  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

/**
 * Execute a command with Bun.spawn
 */
async function runCommand(command: string[], options: Bun.SpawnOptions = {}): Promise<number> {
  log(`Running: ${command.join(' ')}`, 'info');

  const proc = Bun.spawn(command, {
    stdout: 'inherit',
    stderr: 'inherit',
    ...options
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    log(`Command failed with exit code: ${exitCode}`, 'error');
  }

  return exitCode;
}

// Get the platform-specific build configuration
function getBuildConfig(platform: Platform): BuildConfig {
  const configs: Record<Platform, BuildConfig> = {
    'win32': {
      outputFile: join(BUILD_DIR, 'xlsx2pdf.exe'),
      buildArgs: ['build', 'src/index.ts', '--minify', '--compile', '--outfile', join(BUILD_DIR, 'xlsx2pdf.exe')]
    },
    'darwin': {
      outputFile: join(BUILD_DIR, 'xlsx2pdf-mac'),
      buildArgs: ['build', 'src/index.ts', '--minify', '--compile', '--outfile', join(BUILD_DIR, 'xlsx2pdf-mac')],
      postBuildCommands: [['chmod', '+x', join(BUILD_DIR, 'xlsx2pdf-mac')]]
    },
    'linux': {
      outputFile: join(BUILD_DIR, 'xlsx2pdf-linux'),
      buildArgs: ['build', 'src/index.ts', '--minify', '--compile', '--outfile', join(BUILD_DIR, 'xlsx2pdf-linux')],
      postBuildCommands: [['chmod', '+x', join(BUILD_DIR, 'xlsx2pdf-linux')]]
    }
  };

  const config = configs[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return config;
}

// Set up build directory
const BUILD_DIR = './build';

// Main build function
async function buildExecutable(): Promise<void> {
  try {
    // Detect platform
    const platform = process.platform;
    log(`Detected platform: ${platform}`, 'info');
    log(`Using Bun version: ${Bun.version}`, 'info');

    // Create build directory if it doesn't exist
    const buildDir = Bun.file(BUILD_DIR);
    if (!await buildDir.exists()) {
      log(`Creating build directory: ${BUILD_DIR}`, 'info');
      await mkdir(BUILD_DIR, { recursive: true });
    }

    // Read package.json for version info
    let packageInfo: any = { version: '1.0.0' };
    try {
      const packageFile = Bun.file('./package.json');
      packageInfo = await packageFile.json();
      log(`Building version: ${packageInfo.version}`, 'info');
    } catch (error) {
      log('Could not read package.json, using default version', 'warning');
    }

    // Get build configuration for this platform
    const config = getBuildConfig(platform);

    // Execute the build command
    log(`Building for ${platform}...`, 'info');
    const buildResult = await runCommand(['bun', ...config.buildArgs]);

    if (buildResult !== 0) {
      throw new Error(`Build command failed with exit code: ${buildResult}`);
    }

    // Run any post-build commands (like chmod)
    if (config.postBuildCommands) {
      for (const command of config.postBuildCommands) {
        await runCommand(command);
      }
    }

    // Verify the output file exists
    const outputFile = Bun.file(config.outputFile);
    if (await outputFile.exists()) {
      log(`Build completed successfully: ${config.outputFile}`, 'success');
    } else {
      throw new Error(`Build output file not found: ${config.outputFile}`);
    }

    // Copy README.md to build directory if it exists
    const readmeFile = Bun.file('README.md');
    if (await readmeFile.exists()) {
      const readmeContent = await readmeFile.text();
      await Bun.write(join(BUILD_DIR, 'README.md'), readmeContent);
      log('Copied README.md to build directory', 'success');
    }

    // Create version.json with build metadata
    const versionInfo = {
      name: packageInfo.name || 'xlsx2pdf',
      version: packageInfo.version || '1.0.0',
      buildDate: new Date().toISOString(),
      platform: platform,
      bunVersion: Bun.version,
      buildId: crypto.randomUUID()
    };

    await Bun.write(
      join(BUILD_DIR, 'version.json'),
      JSON.stringify(versionInfo, null, 2)
    );
    log('Created version.json in build directory', 'success');

    log('Build process completed successfully!', 'success');

  } catch (error) {
    log(`Build failed: ${error}`, 'error');
    process.exit(1);
  }
}

// Run the build process
buildExecutable();
