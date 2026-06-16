export class FileManager {
    constructor() {
        this.files = [];
    }

    addFile(fileName, blobUrl, fileSize, mimeType) {
        const id = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        this.files.unshift({ id, name: fileName, blobUrl, size: fileSize, date: new Date(), mimeType });
    }

    deleteFile(id) {
        const index = this.files.findIndex(f => f.id === id);
        if (index !== -1) {
            URL.revokeObjectURL(this.files[index].blobUrl);
            this.files.splice(index, 1);
            return true;
        }
        return false;
    }

    clearAll() {
        for (let f of this.files) URL.revokeObjectURL(f.blobUrl);
        this.files = [];
    }

    getFiles() {
        return this.files;
    }

    getFile(id) {
        return this.files.find(f => f.id === id);
    }
}