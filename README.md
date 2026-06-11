# 📄 We Love PDF – All-in-One Client-Side PDF Converter

> **100% local · No uploads · Private & fast**  
> Convert PDFs to DOCX, HTML, TXT, PNG, JPG – plus create PDFs from images.  
> Fully functional file manager with custom file naming.

![App Preview](https://via.placeholder.com/300x600?text=Phone+UI+Mockup)  
*Actual UI is a realistic phone‑style interface with bottom navigation, file lists, and live conversion status.*

---

## ✨ Features

### 🔁 PDF → Other formats (all client‑side)
- **DOCX (Word)** – real `.docx` documents using the `docx` library.
- **HTML** – styled web page with extracted text.
- **TXT** – plain text extraction.
- **PNG / JPG** – render each PDF page as an image and package them into a ZIP archive.

### 🖼️ Images → PDF
- Select one or multiple images (JPG, PNG, GIF, WebP).
- Choose page size: **A4**, **Letter**, or **Fit to Image**.
- Choose orientation: **Portrait** or **Landscape**.
- All images are placed into a single PDF, each on its own page.

### 📁 Built‑in File Manager
- Every converted file is saved to the app’s internal **Files** list.
- **Recent Files** section on the Home screen shows the last 5 files.
- **All Files** screen with search, download, and delete actions.
- **Clear all** button to remove all generated files.

### ✏️ Custom File Naming
- **Enabled by default**: a dialog asks you for a filename before saving.
- Can be **disabled** in Settings → “Ask for filename before saving”.
- If disabled or cancelled, a sensible default name is used (e.g., `document.txt`, `images_2025-01-01.pdf`).

### 🔒 Privacy & Security
- Everything runs inside your browser – **no file uploads, no server**.
- Uses PDF.js, JSZip, docx, and jsPDF locally.
- Works offline after the first load (all libraries are CDN‑based but can be cached).

### ⚙️ Other UI Highlights
- Phone‑style container (380x780px) with rounded corners and bottom navigation.
- Dark / light friendly – uses a fresh teal + orange color scheme.
- Drag & drop PDF upload.
- Real‑time conversion progress status.
- GitHub link in Settings (`https://github.com/Ottahen`).

---

## 🚀 How to Use

### 1. Open the App
Simply open the HTML file in any modern browser (Chrome, Firefox, Edge, Safari). No installation required.

### 2. Convert a PDF
- On the **Home** screen, tap/click the **upload area** or drag & drop a PDF (max 30 MB).
- Choose an output format (DOCX, HTML, TXT, PNG ZIP, JPG ZIP).
- Click **Convert Now**.
- If custom naming is enabled, enter a file name (without extension) or keep the default.
- The converted file appears in **Recent Files** and the **Files** screen.

### 3. Create PDF from Images
- Scroll down on the **Home** screen to the “Images to PDF” card.
- Click the upload area and select one or more images.
- Adjust page size and orientation if needed.
- Click **Create PDF from Images**.
- Enter a custom name (or accept the default).
- The resulting PDF is added to your file list.

### 4. Manage Your Files
- Switch to the **Files** screen using the bottom navigation.
- **Search** for files by name.
- **Download** any file by clicking the download icon.
- **Delete** a file by clicking the trash icon.
- **Clear all files** using the trash icon next to “All files”.

### 5. Custom Naming Toggle
- Go to **Settings** → **Ask for filename before saving**.
- Turn the switch OFF to save files immediately with automatic names (no prompt).

---

## 🛠 Technical Stack

| Library | Purpose |
|---------|---------|
| [PDF.js](https://mozilla.github.io/pdf.js/) | Extract text and render PDF pages to canvas |
| [JSZip](https://stuk.github.io/jszip/) | Package image pages into ZIP archives |
| [docx](https://docx.js.org/) | Generate real `.docx` Word documents |
| [jsPDF](https://github.com/parallax/jsPDF) | Create PDFs from images |
| Font Awesome 6 | Icons for UI |
| Google Fonts (Inter) | Typography |

All libraries are loaded from trusted CDNs – the app works entirely in the browser.

---

## 📱 System Requirements
- Any modern browser with JavaScript enabled.
- Recommended: Chrome, Firefox, Edge, Safari (desktop or mobile).
- Memory: at least 256 MB free for large PDFs (20+ pages).
- File size limit: **30 MB** per PDF (can be adjusted in code).

---

## 🧪 Known Limitations
- **Scanned PDFs** (image‑only) have no extractable text – TXT/HTML/DOCX will show a warning message.
- Very large PDFs (>30 MB) may cause performance issues due to client‑side rendering.
- Image to PDF scaling uses `FAST` rendering – very high‑resolution images may appear slightly pixelated; this keeps performance smooth on mobile.

---

## 📝 License & Credits
- Open source – free to use, modify, and distribute.
- Written by **ℒ** – [GitHub](https://github.com/Ottahen)
- “We Love PDF” – built with love for local, private document conversion.

---

## 🧑‍💻 Developer Notes
- The entire app is a single HTML file – no build step, no dependencies beyond CDN scripts.
- All conversion logic is inside `<script>` tags; state is managed with plain JavaScript.
- File manager uses `URL.createObjectURL()` and revokes URLs on deletion to prevent memory leaks.
- Custom naming can be extended to support auto‑increment or templates.

---



**Enjoy converting PDFs without ever sending your data to a server!**  
Report issues or contribute via [GitHub](https://github.com/Ottahen).
