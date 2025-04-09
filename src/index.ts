import { spawnSync } from 'bun';
import { existsSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { execSync } from 'child_process';

// Create a log file for debugging
function logToFile(message: string) {
  try {
    const logPath = join(dirname(process.execPath), 'xlsx2pdf_log.txt');
    writeFileSync(logPath, `${new Date().toISOString()}: ${message}\n`, { flag: 'a' });
  } catch (error) {
    // Silent fail for logging
  }
}

// ANSI color codes for styling
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Emojis for logging
const emojis = {
  check: '✅',
  cross: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  progress: '🔄',
};

/**
 * Log messages with color and emoji, and also to file.
 */
function log(message: string, color: keyof typeof colors, emoji: keyof typeof emojis) {
  const formattedMessage = `${emojis[emoji]} ${message}`;
  console.log(`${colors[color]}${formattedMessage}${colors.reset}`);
  logToFile(formattedMessage);
}

/**
 * Progress bar for visual feedback
 */
function showProgressBar(current: number, total: number): string {
  const barLength = 20;
  const progress = Math.round((current / total) * barLength);
  const bar = '█'.repeat(progress) + '░'.repeat(barLength - progress);
  const percentage = Math.round((current / total) * 100);
  return `[${bar}] ${current}/${total} (${percentage}%)`;
}

/**
 * Attempts to locate the soffice executable more comprehensively.
 */
function findSoffice(): string | null {
  // Log the search for debugging
  logToFile('Searching for LibreOffice...');

  // Try running soffice directly from PATH
  try {
    const result = spawnSync(['soffice', '--version'], { stdout: 'pipe', stderr: 'pipe' });
    if (result.exitCode === 0) {
      logToFile('Found soffice in PATH');
      return 'soffice';
    }
  } catch (error) {
    logToFile(`Error checking PATH for soffice: ${error}`);
  }

  // Determine the current user's home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (!homeDir) {
    logToFile('Could not determine user home directory');
    return null;
  }

  // Check for a pre-defined custom path from environment variable
  if (process.env.LIBREOFFICE_PATH && existsSync(process.env.LIBREOFFICE_PATH)) {
    logToFile(`Found LibreOffice at environment variable path: ${process.env.LIBREOFFICE_PATH}`);
    return process.env.LIBREOFFICE_PATH;
  }

  // Allow the user to specify a path via a config file
  const configPath = join(dirname(process.execPath), '.libreoffice_path');
  if (existsSync(configPath)) {
    try {
      const configPathContent = require('fs').readFileSync(configPath, 'utf-8').trim();
      if (existsSync(configPathContent)) {
        logToFile(`Found LibreOffice at path from config file: ${configPathContent}`);
        return configPathContent;
      }
    } catch (error) {
      logToFile(`Error reading config file: ${error}`);
    }
  }

  // Try to find soffice binary directly
  logToFile('Searching for soffice in common locations...');

  // Common installation paths for different platforms
  const possiblePaths = [
    // Windows - Scoop installations
    join(homeDir, 'scoop', 'apps', 'libreoffice', 'current', 'program', 'soffice.exe'),
    join(homeDir, 'scoop', 'apps', 'libreoffice', 'current', 'LibreOffice', 'program', 'soffice.exe'),
    join(homeDir, 'AppData', 'Local', 'Programs', 'Scoop', 'apps', 'libreoffice', 'current', 'program', 'soffice.exe'),
    join(homeDir, 'AppData', 'Local', 'Programs', 'Scoop', 'apps', 'libreoffice', 'current', 'LibreOffice', 'program', 'soffice.exe'),

    // Windows - Standard installations
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',

    // macOS
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',

    // Linux
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/usr/lib/libreoffice/program/soffice',
  ];

  // Add a custom path option if user provides a specific path
  logToFile('Adding additional paths for specific Scoop installation structures');

  // Based on your specific installation path
  possiblePaths.push(
    'C:\\Users\\AV01DEC\\AppData\\Local\\Programs\\Scoop\\apps\\libreoffice\\current\\LibreOffice\\program\\soffice.exe'
  );

  for (const path of possiblePaths) {
    logToFile(`Checking path: ${path}`);
    if (existsSync(path)) {
      logToFile(`Found LibreOffice at: ${path}`);
      return path;
    }
  }

  logToFile('LibreOffice not found in any standard location');
  return null;
}

/**
 * Converts the given Excel file to PDF with improved error handling.
 */
function convertToPdf(filePath: string, sofficePath: string): boolean {
  try {
    const absoluteFilePath = resolve(filePath);
    const fileDir = dirname(absoluteFilePath);
    const fileName = basename(absoluteFilePath, extname(absoluteFilePath));
    const outputFilePath = join(fileDir, `${fileName}.pdf`);

    logToFile(`Converting: ${absoluteFilePath} to ${outputFilePath}`);
    logToFile(`Using soffice path: ${sofficePath}`);

    // First ensure the file exists
    if (!existsSync(absoluteFilePath)) {
      log(`File does not exist: ${absoluteFilePath}`, 'red', 'cross');
      return false;
    }

    log(`Converting ${fileName}.xlsx...`, 'blue', 'progress');

    const command = [sofficePath, '--headless', '--convert-to', 'pdf', absoluteFilePath, '--outdir', fileDir];
    logToFile(`Executing command: ${command.join(' ')}`);

    const result = spawnSync(command, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    if (result.exitCode === 0) {
      if (existsSync(outputFilePath)) {
        log(`Converted: ${fileName}.xlsx → ${fileName}.pdf`, 'green', 'check');
        return true;
      } else {
        log(`Command succeeded but output file not found: ${outputFilePath}`, 'yellow', 'warn');
        logToFile(`Command output: ${result.stdout.toString()}`);
        return false;
      }
    } else {
      const stderr = result.stderr.toString();
      log(`Failed to convert: ${fileName}.xlsx`, 'red', 'cross');
      logToFile(`Error: ${stderr}`);
      console.error(`${colors.red}Error details: ${stderr}${colors.reset}`);
      return false;
    }
  } catch (error) {
    log(`Exception during conversion: ${error}`, 'red', 'cross');
    logToFile(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    return false;
  }
}

/**
 * Wait for user input with improved handling for executable context.
 */
async function promptExit(): Promise<void> {
  log('Conversion process completed.', 'blue', 'info');
  log('Press any key to exit...', 'magenta', 'info');

  if (process.platform === 'win32') {
    try {
      // Try the Windows pause command to keep the window open
      execSync('pause', { stdio: 'inherit' });
      return;
    } catch (error) {
      logToFile(`Pause command failed: ${error}`);
    }
  }

  // For non-Windows or fallback
  try {
    if (process.stdin.isTTY) {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await new Promise<void>((resolve) => rl.question('', () => {
        rl.close();
        resolve();
      }));
    } else {
      // If not in a TTY, wait for a longer time
      log('No interactive terminal detected. Waiting 30 seconds before exit...', 'blue', 'info');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  } catch (error) {
    logToFile(`Error in promptExit: ${error}`);
    // Last resort: Just wait
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

/**
 * Main function with enhanced error handling.
 */
async function main(): Promise<void> {
  // Define files array with explicit type
  let files: string[] = [];
  try {
    // Clear the log file at the start
    try {
      writeFileSync(join(dirname(process.execPath), 'xlsx2pdf_log.txt'), `=== Excel to PDF Conversion Started at ${new Date().toISOString()} ===\n`, { flag: 'w' });
    } catch (error) {
      // If we can't write to the log file, continue anyway
    }

    logToFile('Script started');
    logToFile(`Arguments: ${JSON.stringify(process.argv)}`);
    logToFile(`Current working directory: ${process.cwd()}`);
    logToFile(`Executable path: ${process.execPath}`);

    log('Excel to PDF Converter', 'green', 'info');
    log('Searching for LibreOffice...', 'blue', 'info');

    const sofficePath: string | null = findSoffice();
    if (!sofficePath) {
      log('LibreOffice (soffice) is not installed or not found. Please install LibreOffice or add it to your PATH.', 'red', 'cross');
      await promptExit();
      return;
    }

    log(`Found LibreOffice at: ${sofficePath}`, 'green', 'check');

    // Explicitly type cast the arguments to string array to satisfy TypeScript
    files = process.argv.slice(2).filter((arg): arg is string => typeof arg === 'string');
    logToFile(`Files to process: ${files.length}`);

    if (files.length === 0) {
      log('No files provided. Drag and drop .xlsx files onto the executable.', 'yellow', 'warn');
      await promptExit();
      return;
    }

    let validFilesCount = 0;
    let successCount = 0;

    log(`Processing ${files.length} file(s)...`, 'blue', 'info');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Skip if file is undefined
      if (typeof file !== 'string') {
        logToFile(`Skipping undefined file at index ${i}`);
        continue;
      }

      logToFile(`Processing file ${i + 1}/${files.length}: ${file}`);

      console.log(`${colors.blue}${emojis.progress} ${showProgressBar(i + 1, files.length)}${colors.reset}`);

      if (extname(file).toLowerCase() === '.xlsx' && existsSync(file)) {
        validFilesCount++;
        if (sofficePath && convertToPdf(file, sofficePath)) {
          successCount++;
        }
      } else {
        log(`Invalid file: ${file}. Ensure it's an existing .xlsx file.`, 'yellow', 'warn');
      }
    }

    log(`Conversion completed. Successfully converted ${successCount} out of ${validFilesCount} valid files.`, 'green', 'info');

    await promptExit();
  } catch (error) {
    logToFile(`Unhandled error in main: ${error}`);
    logToFile(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    log(`An unexpected error occurred: ${error}. Check xlsx2pdf_log.txt for details.`, 'red', 'cross');
    await promptExit();
  }
}

// Catch any unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logToFile(`Unhandled rejection: ${reason}`);
});

// Start the main function
main();
