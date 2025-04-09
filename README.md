# XLSX2PDF

![XLSX2PDF Logo](https://via.placeholder.com/150x150.png?text=XLSX2PDF)

A fast, lightweight utility to convert Excel (.xlsx) files to PDF format with just a drag and drop. Built with [Bun](https://bun.sh) for maximum performance and easy distribution.

## ✨ Features

- **Simple Conversion**: Drag & drop Excel files onto the executable to convert them to PDF
- **Batch Processing**: Convert multiple Excel files at once
- **Visual Feedback**: Progress bar shows real-time conversion status
- **Same-Directory Output**: PDFs are saved in the same folder as source files
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Detailed Logging**: Comprehensive logs for troubleshooting

## 📋 Requirements

- **LibreOffice**: The application uses [LibreOffice](https://www.libreoffice.org/download/download/) for conversion

## 🚀 Installation

### Download Pre-built Binary

1. Download the latest release for your platform from the [Releases page](https://github.com/Sephyi/xlsx2pdf/releases)
2. Extract the executable to any convenient location
3. On macOS/Linux, make the file executable:

   ```bash
   chmod +x xlsx2pdf-mac    # or xlsx2pdf-linux
   ```

### Build from Source

If you prefer to build the application yourself:

```bash
# Clone the repository
git clone https://github.com/Sephyi/xlsx2pdf.git
cd xlsx2pdf

# Install dependencies
bun install

# Build for your platform
bun run build
```

## 🔧 Usage

### Drag & Drop

Simply drag one or more Excel (.xlsx) files onto the XLSX2PDF executable:

1. The application will open a terminal window with progress information
2. When conversion is complete, you'll find PDF files in the same directory
3. Each PDF will have the same name as its source Excel file

### Command Line

```bash
# Convert a single file
./xlsx2pdf-mac path/to/file.xlsx

# Convert multiple files
./xlsx2pdf-mac file1.xlsx file2.xlsx file3.xlsx
```

## ⚙️ LibreOffice Configuration

XLSX2PDF requires LibreOffice to perform Excel-to-PDF conversion. The application will:

1. Try to find LibreOffice automatically in common installation locations
2. Create a `.libreoffice_path` configuration file if needed
3. Use the path specified in this file if LibreOffice isn't found automatically

### Common LibreOffice Paths

- **Windows**:
  - Standard: `C:\Program Files\LibreOffice\program\soffice.exe`
  - Scoop: `C:\Users\{username}\scoop\apps\libreoffice\current\LibreOffice\program\soffice.exe`
  - App Data: `C:\Users\{username}\AppData\Local\Programs\Scoop\apps\libreoffice\current\LibreOffice\program\soffice.exe`

- **macOS**:
  - `/Applications/LibreOffice.app/Contents/MacOS/soffice`

- **Linux**:
  - `/usr/bin/soffice`
  - `/usr/lib/libreoffice/program/soffice`

## 🔍 Troubleshooting

### Log Files

Check the following log files if you encounter issues:

- `xlsx2pdf_log.txt`: Detailed information about the conversion process
- `.libreoffice_path`: Configuration file for LibreOffice path

### Common Issues

#### LibreOffice Not Found

If LibreOffice isn't detected automatically:

1. Ensure LibreOffice is installed on your system
2. Edit `.libreoffice_path` with the full path to the `soffice` executable
3. Make sure to include the full path including the executable name (`soffice.exe` on Windows)

#### Conversion Failures

If files aren't converting properly:

1. Check that your Excel files aren't password-protected
2. Ensure you have write permissions in the directory
3. Check the log file for specific error messages
4. Try running the application from a command line to see detailed output

#### Application Closes Immediately

If the application window closes immediately:

1. Run it from a command prompt/terminal to see error messages
2. Check the log file for details
3. Ensure LibreOffice is correctly installed and accessible

## 🛠️ Development

XLSX2PDF is built with Bun and TypeScript, using Bun's native APIs for maximum performance.

### Build System

The build system is almost completely Bun-native, using:

- `Bun.spawn()` for process execution
- `Bun.file()` and `Bun.write()` for file operations
- ~~`Bun.mkdir()` for directory creation~~

### Cross-Platform Building

The project includes GitHub Actions workflows for automatic building on all platforms:

- Windows (.exe)
- macOS (executable)
- Linux (executable)

To build manually for a specific platform:

```bash
# Windows
bun run build:win

# macOS
bun run build:mac

# Linux
bun run build:linux
```

## 📄 License

MIT License

## 🙏 Credits

- Built with [Bun](https://bun.sh)
- Uses [LibreOffice](https://www.libreoffice.org/) for PDF conversion
