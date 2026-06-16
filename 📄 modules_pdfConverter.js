export class PDFConverter {
    constructor(fileManager, vaultManager) {
        this.fileManager = fileManager;
        this.vaultManager = vaultManager;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        this.customNamingEnabled = true; // Will be toggled from UI
    }

    async extractFullTextFromPDF(arrayBuffer) {
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

    escapeHtml(str) {
        return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    async getFinalFileName(defaultName, extension) {
        if (!this.customNamingEnabled) return defaultName;
        let suggested = defaultName;
        if (!suggested.includes('.')) suggested += '.' + extension;
        const userInput = prompt('Name your file (without extension):', suggested.replace('.' + extension, ''));
        if (userInput === null || userInput.trim() === '') return suggested;
        let clean = userInput.trim();
        if (!clean.endsWith('.' + extension)) clean += '.' + extension;
        return clean;
    }

    async convertAndSave(blob, defaultName, extension, mimeType, saveToVault) {
        const finalName = await this.getFinalFileName(defaultName, extension);
        if (saveToVault) {
            const arrayBuffer = await blob.arrayBuffer();
            const success = await this.vaultManager.encryptAndStore(finalName, arrayBuffer, blob.size, mimeType);
            return success;
        } else {
            const blobUrl = URL.createObjectURL(blob);
            this.fileManager.addFile(finalName, blobUrl, blob.size, mimeType);
            return true;
        }
    }

    async convertToTxt(file, saveToVault) {
        const buf = await file.arrayBuffer();
        const text = await this.extractFullTextFromPDF(buf);
        const blob = new Blob([text], { type: 'text/plain' });
        const defaultName = file.name.replace(/\.pdf$/i, '') + '.txt';
        return await this.convertAndSave(blob, defaultName, 'txt', 'text/plain', saveToVault);
    }

    async convertToHtml(file, saveToVault) {
        const buf = await file.arrayBuffer();
        const text = await this.extractFullTextFromPDF(buf);
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${this.escapeHtml(file.name)}</title><style>body{font-family:Inter,sans-serif;max-width:900px;margin:40px auto;padding:20px;background:#fef9e6;}pre{background:#fff2df;padding:20px;border-radius:20px;}</style></head><body><h1>Converted from: ${this.escapeHtml(file.name)}</h1><pre>${this.escapeHtml(text)}</pre></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const defaultName = file.name.replace(/\.pdf$/i, '') + '.html';
        return await this.convertAndSave(blob, defaultName, 'html', 'text/html', saveToVault);
    }

    async convertToDocx(file, saveToVault) {
        const buf = await file.arrayBuffer();
        const fullText = await this.extractFullTextFromPDF(buf);
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
        return await this.convertAndSave(blob, defaultName, 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', saveToVault);
    }

    async convertToImages(file, imageFormat, saveToVault) {
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
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const defaultName = file.name.replace(/\.pdf$/i, `_${imageFormat}_pages.zip`);
        return await this.convertAndSave(zipBlob, defaultName, 'zip', 'application/zip', saveToVault);
    }

    async startConversion(selectedFile, currentFormat, saveToVault, setStatus) {
        if (!selectedFile) {
            setStatus('No PDF selected.', true);
            return;
        }
        try {
            if (currentFormat === 'txt') await this.convertToTxt(selectedFile, saveToVault);
            else if (currentFormat === 'html') await this.convertToHtml(selectedFile, saveToVault);
            else if (currentFormat === 'docx') await this.convertToDocx(selectedFile, saveToVault);
            else if (currentFormat === 'png') await this.convertToImages(selectedFile, 'png', saveToVault);
            else if (currentFormat === 'jpg') await this.convertToImages(selectedFile, 'jpg', saveToVault);
            else throw new Error('Unsupported format');
            setStatus('Conversion complete!', false);
            return true;
        } catch (err) {
            setStatus(`Error: ${err.message}`, true);
            return false;
        }
    }
}