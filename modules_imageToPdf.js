export class ImageToPDF {
    constructor(fileManager, vaultManager) {
        this.fileManager = fileManager;
        this.vaultManager = vaultManager;
        this.customNamingEnabled = true;
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

    async convert(selectedImages, pageSize, orientation, saveToVault, setStatus) {
        if (selectedImages.length === 0) {
            setStatus('Please select at least one image.', true);
            return false;
        }
        const { jsPDF } = window.jspdf;
        let pdf;
        try {
            for (let i = 0; i < selectedImages.length; i++) {
                const imgFile = selectedImages[i];
                const imgData = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.readAsDataURL(imgFile);
                });
                const img = await new Promise(resolve => {
                    const im = new Image();
                    im.onload = () => resolve(im);
                    im.src = imgData;
                });
                if (i === 0) {
                    if (pageSize === 'a4') {
                        pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
                    } else if (pageSize === 'letter') {
                        pdf = new jsPDF({ orientation, unit: 'mm', format: 'letter' });
                    } else {
                        pdf = new jsPDF({ orientation: img.width > img.height ? 'landscape' : 'portrait', unit: 'px', format: [img.width, img.height] });
                    }
                } else {
                    pdf.addPage();
                }
                if (pageSize === 'fit') {
                    pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height, undefined, 'FAST');
                } else {
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    let finalW = pageWidth;
                    let finalH = (img.height * finalW) / img.width;
                    if (finalH > pageHeight) {
                        finalH = pageHeight;
                        finalW = (img.width * finalH) / img.height;
                    }
                    const x = (pageWidth - finalW) / 2,
                        y = (pageHeight - finalH) / 2;
                    pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
                }
                setStatus(`Added image ${i+1}/${selectedImages.length}`, false, true);
            }
            const pdfBlob = pdf.output('blob');
            const defaultName = `images_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`;
            await this.convertAndSave(pdfBlob, defaultName, 'pdf', 'application/pdf', saveToVault);
            setStatus('PDF from images saved successfully!', false);
            return true;
        } catch (err) {
            setStatus(`Image to PDF error: ${err.message}`, true);
            return false;
        }
    }
}