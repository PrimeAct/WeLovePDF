// -------------------- FILE MANAGEMENT --------------------
let generatedFiles = [];
let customNamingEnabled = true;

function addGeneratedFile(fileName, blobUrl, fileSize, mimeType) {
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    generatedFiles.unshift({ id, name: fileName, blobUrl, size: fileSize, date: new Date(), mimeType });
    renderAllFiles();
    renderRecentFiles();
}

function deleteFileById(id) {
    const index = generatedFiles.findIndex(f => f.id === id);
    if (index !== -1) {
        URL.revokeObjectURL(generatedFiles[index].blobUrl);
        generatedFiles.splice(index, 1);
        renderAllFiles();
        renderRecentFiles();
    }
}

function clearAllFiles() {
    for (let f of generatedFiles) URL.revokeObjectURL(f.blobUrl);
    generatedFiles = [];
    renderAllFiles();
    renderRecentFiles();
}

function renderRecentFiles() {
    const container = document.getElementById('recentFilesContainer');
    if (!container) return;
    const recent = generatedFiles.slice(0, 5);
    if (recent.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>No files yet. Convert a PDF or create PDF from images.</p></div>`;
        return;
    }
    container.innerHTML = recent.map(file => `
        <div class="file-card">
            <div class="file-thumb">${getFileIcon(file.name)}</div>
            <div class="file-info">
                <h4>${escapeHtml(file.name.length > 30 ? file.name.slice(0,27)+'...' : file.name)}</h4>
                <p>${formatDate(file.date)} · ${formatSize(file.size)}</p>
            </div>
            <div class="file-actions">
                <i class="fa-solid fa-download" onclick="window.downloadFileById('${file.id}')"></i>
                <i class="fa-solid fa-trash-can" onclick="window.deleteFileById('${file.id}')"></i>
            </div>
        </div>
    `).join('');
}

function renderAllFiles() {
    const container = document.getElementById('allFilesContainer');
    const countSpan = document.getElementById('fileCount');
    if (!container) return;
    const searchTerm = document.getElementById('fileSearchInput')?.value.toLowerCase() || '';
    let filtered = generatedFiles;
    if (searchTerm) filtered = generatedFiles.filter(f => f.name.toLowerCase().includes(searchTerm));
    if (countSpan) countSpan.innerText = filtered.length;
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>No files found. Create a PDF from images or convert a document.</p></div>`;
        return;
    }
    container.innerHTML = filtered.map(file => `
        <div class="file-card">
            <div class="file-thumb">${getFileIcon(file.name)}</div>
            <div class="file-info">
                <h4>${escapeHtml(file.name)}</h4>
                <p>${formatDate(file.date)} · ${formatSize(file.size)}</p>
            </div>
            <div class="file-actions">
                <i class="fa-solid fa-download" onclick="window.downloadFileById('${file.id}')"></i>
                <i class="fa-solid fa-trash-can" onclick="window.deleteFileById('${file.id}')"></i>
            </div>
        </div>
    `).join('');
}

window.downloadFileById = function(id) {
    const file = generatedFiles.find(f => f.id === id);
    if (file && file.blobUrl) {
        const a = document.createElement('a');
        a.href = file.blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};
window.deleteFileById = deleteFileById;

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'docx') return '<i class="fa-regular fa-file-word"></i>';
    if (ext === 'html') return '<i class="fa-solid fa-code"></i>';
    if (ext === 'txt') return '<i class="fa-regular fa-file-lines"></i>';
    if (ext === 'zip') return '<i class="fa-regular fa-file-zipper"></i>';
    if (ext === 'pdf') return '<i class="fa-regular fa-file-pdf"></i>';
    return '<i class="fa-regular fa-file"></i>';
}

function formatDate(date) {
    return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) + ' · ' + date.toLocaleDateString();
}
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}
function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
}

async function getFinalFileName(defaultName, extension) {
    if (!customNamingEnabled) return defaultName;
    let suggested = defaultName;
    if (!suggested.includes('.')) suggested += '.' + extension;
    const userInput = prompt('Name your file (without extension):', suggested.replace('.'+extension, ''));
    if (userInput === null || userInput.trim() === '') return suggested;
    let clean = userInput.trim();
    if (!clean.endsWith('.' + extension)) clean += '.' + extension;
    return clean;
}

// -------------------- PDF CONVERSION ENGINE --------------------
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const filePreviewDiv = document.getElementById('filePreview');
const fileNameSpan = document.getElementById('fileName');
const formatBtns = document.querySelectorAll('.format-chip');
const convertBtn = document.getElementById('convertBtn');
const statusTextSpan = document.getElementById('statusText');
const statusIconSpan = document.querySelector('#statusMessage i');

let selectedFile = null;
let currentFormat = 'docx';

function setStatus(message, isError = false, isLoading = false) {
    statusTextSpan.innerText = message;
    if (isError) {
        statusIconSpan.className = 'fas fa-exclamation-triangle';
        statusIconSpan.style.color = '#dc2626';
        statusIconSpan.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else if (isLoading) {
        statusIconSpan.innerHTML = '<div class="loader-mini"></div>';
        statusIconSpan.style.color = '#f39c12';
    } else {
        statusIconSpan.className = 'fa-regular fa-heart';
        statusIconSpan.innerHTML = '<i class="fa-regular fa-heart"></i>';
        statusIconSpan.style.color = '#f39c12';
    }
}

function resetStatusReady() {
    if (selectedFile) statusTextSpan.innerText = `Loaded: ${selectedFile.name} · Format: ${currentFormat.toUpperCase()}`;
    else statusTextSpan.innerText = 'Upload a PDF and choose format';
    statusIconSpan.className = 'fa-regular fa-heart';
    statusIconSpan.innerHTML = '<i class="fa-regular fa-heart"></i>';
}

function handleFileSelect(file) {
    if (!file || file.type !== 'application/pdf') {
        setStatus('Invalid PDF file.', true);
        selectedFile = null;
        filePreviewDiv.style.display = 'none';
        return false;
    }
    if (file.size > 30 * 1024 * 1024) {
        setStatus('File exceeds 30MB limit.', true);
        selectedFile = null;
        filePreviewDiv.style.display = 'none';
        return false;
    }
    selectedFile = file;
    fileNameSpan.innerText = file.name.length > 28 ? file.name.slice(0,25)+'...' : file.name;
    filePreviewDiv.style.display = 'inline-flex';
    setStatus(`Loaded: ${file.name} · Ready for ${currentFormat.toUpperCase()}`, false);
    resetStatusReady();
    return true;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#f39c12'; uploadArea.style.background = '#fff3e2'; });
uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#ffe0b5'; uploadArea.style.background = '#fffdf7'; });
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ffe0b5';
    uploadArea.style.background = '#fffdf7';
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFileSelect(e.target.files[0]); });

formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.getAttribute('data-format');
        if (selectedFile) setStatus(`Format changed to ${currentFormat.toUpperCase()} · ${selectedFile.name}`, false);
        else setStatus(`Format set to ${currentFormat.toUpperCase()}. Upload a PDF.`, false);
        resetStatusReady();
    });
});

async function extractFullTextFromPDF(arrayBuffer) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
    }
    return fullText.trim() || "No extractable text (this PDF may be scanned).";
}

function escapeHtmlForText(str) { return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;')); }

async function convertToTxt(file) {
    setStatus('Extracting text for TXT...', false, true);
    const buf = await file.arrayBuffer();
    const text = await extractFullTextFromPDF(buf);
    const blob = new Blob([text], { type: 'text/plain' });
    const defaultName = file.name.replace(/\.pdf$/i, '') + '.txt';
    const finalName = await getFinalFileName(defaultName, 'txt');
    const blobUrl = URL.createObjectURL(blob);
    addGeneratedFile(finalName, blobUrl, blob.size, 'text/plain');
    setStatus('TXT file saved to Files.', false);
}

async function convertToHtml(file) {
    setStatus('Building HTML document...', false, true);
    const buf = await file.arrayBuffer();
    const text = await extractFullTextFromPDF(buf);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtmlForText(file.name)}</title><style>body{font-family:Inter,sans-serif;max-width:900px;margin:40px auto;padding:20px;background:#fef9e6;}pre{background:#fff2df;padding:20px;border-radius:20px;}</style></head><body><h1>Converted from: ${escapeHtmlForText(file.name)}</h1><pre>${escapeHtmlForText(text)}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const defaultName = file.name.replace(/\.pdf$/i, '') + '.html';
    const finalName = await getFinalFileName(defaultName, 'html');
    const blobUrl = URL.createObjectURL(blob);
    addGeneratedFile(finalName, blobUrl, blob.size, 'text/html');
    setStatus('HTML document saved to Files.', false);
}

async function convertToDocx(file) {
    setStatus('Creating DOCX document...', false, true);
    const buf = await file.arrayBuffer();
    const fullText = await extractFullTextFromPDF(buf);
    const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length === 0) paragraphs.push(fullText || "(no content)");
    const { Document, Packer, Paragraph, TextRun, AlignmentType } = window.docx;
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ children: [new TextRun({ text: `Converted from: ${file.name}`, bold: true, size: 32, color: "E67E22" })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
                ...paragraphs.map(para => new Paragraph({ children: [new TextRun({ text: para.trim(), size: 24, font: "Calibri" })], spacing: { after: 200 } }))
            ]
        }]
    });
    const blob = await Packer.toBlob(doc);
    const defaultName = file.name.replace(/\.pdf$/i, '') + '.docx';
    const finalName = await getFinalFileName(defaultName, 'docx');
    const blobUrl = URL.createObjectURL(blob);
    addGeneratedFile(finalName, blobUrl, blob.size, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    setStatus('DOCX file saved to Files.', false);
}

async function convertToImages(file, imageFormat) {
    setStatus(`Rendering PDF pages as ${imageFormat.toUpperCase()} images...`, false, true);
    const buf = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    const numPages = pdfDoc.numPages;
    const zip = new JSZip();
    const scale = 2.0;
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;
        let blob;
        if (imageFormat === 'png') blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        else blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
        zip.file(`page_${i}.${imageFormat === 'png' ? 'png' : 'jpg'}`, blob, { binary: true });
        setStatus(`Rendered page ${i}/${numPages}`, false, true);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const defaultName = file.name.replace(/\.pdf$/i, `_${imageFormat}_pages.zip`);
    const finalName = await getFinalFileName(defaultName, 'zip');
    const blobUrl = URL.createObjectURL(zipBlob);
    addGeneratedFile(finalName, blobUrl, zipBlob.size, 'application/zip');
    setStatus(`ZIP with ${numPages} images saved to Files.`, false);
}

async function startConversion() {
    if (!selectedFile) { setStatus('No PDF selected.', true); return; }
    convertBtn.disabled = true;
    const originalHTML = convertBtn.innerHTML;
    convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-pulse"></i> Converting...';
    try {
        if (currentFormat === 'txt') await convertToTxt(selectedFile);
        else if (currentFormat === 'html') await convertToHtml(selectedFile);
        else if (currentFormat === 'docx') await convertToDocx(selectedFile);
        else if (currentFormat === 'png') await convertToImages(selectedFile, 'png');
        else if (currentFormat === 'jpg') await convertToImages(selectedFile, 'jpg');
        else throw new Error('Unsupported format');
        resetStatusReady();
    } catch (err) { setStatus(`Error: ${err.message}`, true); }
    finally { convertBtn.disabled = false; convertBtn.innerHTML = originalHTML; if (selectedFile) resetStatusReady(); }
}
convertBtn.addEventListener('click', startConversion);
document.querySelector('.format-chip[data-format="docx"]').classList.add('active');
currentFormat = 'docx';

// -------------------- IMAGE TO PDF --------------------
let selectedImages = [];
const imageInput = document.getElementById('imageInput');
const imageUploadArea = document.getElementById('imageUploadArea');
const imagePreviewList = document.getElementById('imagePreviewList');
const clearImagesBtn = document.getElementById('clearImagesBtn');
const imagesToPdfBtn = document.getElementById('imagesToPdfBtn');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const orientationSelect = document.getElementById('orientationSelect');

function updateImagePreview() {
    if (selectedImages.length === 0) { imagePreviewList.style.display = 'none'; imagePreviewList.innerHTML = ''; return; }
    imagePreviewList.style.display = 'block';
    imagePreviewList.innerHTML = selectedImages.map((img, idx) => `<div class="image-preview-item"><span><i class="fa-regular fa-image"></i> ${escapeHtml(img.name)} (${formatSize(img.size)})</span><i class="fa-solid fa-trash-can" style="cursor:pointer; color:#e53e3e;" onclick="window.removeImage(${idx})"></i></div>`).join('');
}
window.removeImage = function(idx) { selectedImages.splice(idx, 1); updateImagePreview(); };
imageUploadArea.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    for (let file of files) if (file.type.startsWith('image/')) selectedImages.push(file);
    updateImagePreview();
    imageInput.value = '';
});
clearImagesBtn.addEventListener('click', () => { selectedImages = []; updateImagePreview(); });

imagesToPdfBtn.addEventListener('click', async () => {
    if (selectedImages.length === 0) { setStatus('Please select at least one image.', true); return; }
    imagesToPdfBtn.disabled = true;
    const originalText = imagesToPdfBtn.innerHTML;
    imagesToPdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-pulse"></i> Creating PDF...';
    setStatus(`Processing ${selectedImages.length} images...`, false, true);
    try {
        const { jsPDF } = window.jspdf;
        const pageSize = pageSizeSelect.value;
        const orientation = orientationSelect.value;
        let pdf;
        for (let i = 0; i < selectedImages.length; i++) {
            const imgFile = selectedImages[i];
            const imgData = await new Promise(resolve => { const reader = new FileReader(); reader.onload = e => resolve(e.target.result); reader.readAsDataURL(imgFile); });
            const img = await new Promise(resolve => { const im = new Image(); im.onload = () => resolve(im); im.src = imgData; });
            if (i === 0) {
                if (pageSize === 'a4') {
                    pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
                } else if (pageSize === 'letter') {
                    pdf = new jsPDF({ orientation, unit: 'mm', format: 'letter' });
                } else {
                    pdf = new jsPDF({ orientation: img.width > img.height ? 'landscape' : 'portrait', unit: 'px', format: [img.width, img.height] });
                }
            } else { pdf.addPage(); }
            if (pageSize === 'fit') {
                pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height, undefined, 'FAST');
            } else {
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                let finalW = pageWidth;
                let finalH = (img.height * finalW) / img.width;
                if (finalH > pageHeight) { finalH = pageHeight; finalW = (img.width * finalH) / img.height; }
                const x = (pageWidth - finalW) / 2, y = (pageHeight - finalH) / 2;
                pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
            }
            setStatus(`Added image ${i+1}/${selectedImages.length}`, false, true);
        }
        const pdfBlob = pdf.output('blob');
        const defaultName = `images_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`;
        const finalName = await getFinalFileName(defaultName, 'pdf');
        const blobUrl = URL.createObjectURL(pdfBlob);
        addGeneratedFile(finalName, blobUrl, pdfBlob.size, 'application/pdf');
        setStatus('PDF from images saved to Files.', false);
        selectedImages = [];
        updateImagePreview();
    } catch (err) { setStatus(`Image to PDF error: ${err.message}`, true); }
    finally { imagesToPdfBtn.disabled = false; imagesToPdfBtn.innerHTML = originalText; }
});

// -------------------- UI Helpers & Navigation --------------------
document.getElementById('clearAllFilesBtn')?.addEventListener('click', () => { if (confirm('Delete all files?')) clearAllFiles(); });
document.getElementById('clearRecentBtn')?.addEventListener('click', () => { if (confirm('Delete all files?')) clearAllFiles(); });
const searchInputFiles = document.getElementById('fileSearchInput');
if (searchInputFiles) searchInputFiles.addEventListener('input', () => renderAllFiles());

const navItems = document.querySelectorAll('.nav-item');
const screens = { 'home-screen': document.getElementById('home-screen'), 'files-screen': document.getElementById('files-screen'), 'settings-screen': document.getElementById('settings-screen') };
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const screenId = item.getAttribute('data-screen');
        if (!screenId || !screens[screenId]) return;
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenId].classList.add('active');
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        if (screenId === 'files-screen') renderAllFiles();
        if (screenId === 'home-screen') renderRecentFiles();
    });
});

const githubBtn = document.getElementById('githubBtn');
if (githubBtn) githubBtn.addEventListener('click', () => window.open('https://github.com/Ottahen', '_blank'));
const premiumBtn = document.getElementById('premiumFakeBtn');
if (premiumBtn) premiumBtn.addEventListener('click', () => setStatus('All features are already free and client‑side!', false));

const namingToggle = document.getElementById('customNamingToggle');
if (namingToggle) namingToggle.addEventListener('change', (e) => { customNamingEnabled = e.target.checked; setStatus(`Custom naming ${customNamingEnabled ? 'enabled' : 'disabled'}`, false); });

renderRecentFiles();
renderAllFiles();
setStatus('We Love PDF! You can now name your files before saving.', false);