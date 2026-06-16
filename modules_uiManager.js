export class UIManager {
    constructor(fileManager, vaultManager, pdfConverter, imageToPdf, chatManager) {
        this.fileManager = fileManager;
        this.vaultManager = vaultManager;
        this.pdfConverter = pdfConverter;
        this.imageToPdf = imageToPdf;
        this.chatManager = chatManager;

        // UI state
        this.selectedFile = null;
        this.currentFormat = 'docx';
        this.selectedImages = [];

        // DOM refs
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.fileNameSpan = document.getElementById('fileName');
        this.formatBtns = document.querySelectorAll('.format-chip');
        this.convertBtn = document.getElementById('convertBtn');
        this.statusText = document.getElementById('statusText');
        this.statusIcon = document.querySelector('#statusMessage i');
        this.saveToVaultCheckbox = document.getElementById('saveToVaultCheckbox');
        this.imageToVaultCheckbox = document.getElementById('imageToVaultCheckbox');

        // Image to PDF refs
        this.imageUploadArea = document.getElementById('imageUploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreviewList = document.getElementById('imagePreviewList');
        this.clearImagesBtn = document.getElementById('clearImagesBtn');
        this.imagesToPdfBtn = document.getElementById('imagesToPdfBtn');
        this.pageSizeSelect = document.getElementById('pageSizeSelect');
        this.orientationSelect = document.getElementById('orientationSelect');

        // Chat refs
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.chatMessagesContainer = document.getElementById('chatMessages');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.apiEndpointInput = document.getElementById('apiEndpointInput');
        this.customNamingToggle = document.getElementById('customNamingToggle');

        // Vault refs
        this.vaultPasswordInput = document.getElementById('vaultPasswordInput');
        this.unlockVaultBtn = document.getElementById('unlockVaultBtn');
        this.vaultSetPassword = document.getElementById('vaultSetPassword');
        this.saveVaultPasswordBtn = document.getElementById('saveVaultPasswordBtn');
        this.clearVaultBtn = document.getElementById('clearVaultBtn');
        this.vaultFilesContainer = document.getElementById('vaultFilesContainer');

        // File list refs
        this.allFilesContainer = document.getElementById('allFilesContainer');
        this.recentFilesContainer = document.getElementById('recentFilesContainer');
        this.fileCount = document.getElementById('fileCount');
        this.clearAllFilesBtn = document.getElementById('clearAllFilesBtn');
        this.clearRecentBtn = document.getElementById('clearRecentBtn');
        this.fileSearchInput = document.getElementById('fileSearchInput');

        // Navigation
        this.navItems = document.querySelectorAll('.nav-item');
        this.screens = {
            'home-screen': document.getElementById('home-screen'),
            'files-screen': document.getElementById('files-screen'),
            'vault-screen': document.getElementById('vault-screen'),
            'chat-screen': document.getElementById('chat-screen'),
            'settings-screen': document.getElementById('settings-screen')
        };

        // Bind methods
        this.setStatus = this.setStatus.bind(this);
        this.renderAllFiles = this.renderAllFiles.bind(this);
        this.renderRecentFiles = this.renderRecentFiles.bind(this);
        this.renderVaultFiles = this.renderVaultFiles.bind(this);
        this.renderChatMessages = this.renderChatMessages.bind(this);
        this.updateImagePreview = this.updateImagePreview.bind(this);
    }

    init() {
        // Set up PDF converter custom naming
        this.pdfConverter.customNamingEnabled = this.customNamingToggle.checked;
        this.imageToPdf.customNamingEnabled = this.customNamingToggle.checked;

        // Load saved configs
        this.loadAPIConfig();
        this.chatManager.loadHistory();

        // Render initial states
        this.renderAllFiles();
        this.renderRecentFiles();
        this.renderChatMessages();

        // Bind events
        this.bindEvents();

        // Set default format
        document.querySelector('.format-chip[data-format="docx"]')?.classList.add('active');
        this.currentFormat = 'docx';
        this.setStatus('We Love PDF! Chat with Chaton Fat using your own API key.', false);
    }

    bindEvents() {
        // Upload
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFileSelect(e.target.files[0]);
        });
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = '#f39c12';
            this.uploadArea.style.background = '#fff3e2';
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.style.borderColor = '#ffe0b5';
            this.uploadArea.style.background = '#fffdf7';
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = '#ffe0b5';
            this.uploadArea.style.background = '#fffdf7';
            if (e.dataTransfer.files.length) this.handleFileSelect(e.dataTransfer.files[0]);
        });

        // Format selection
        this.formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.formatBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFormat = btn.getAttribute('data-format');
                if (this.selectedFile) {
                    this.setStatus(`Format: ${this.currentFormat.toUpperCase()} · ${this.selectedFile.name}`, false);
                } else {
                    this.setStatus(`Format set to ${this.currentFormat.toUpperCase()}. Upload a PDF.`, false);
                }
            });
        });

        // Convert
        this.convertBtn.addEventListener('click', async () => {
            if (!this.selectedFile) {
                this.setStatus('No PDF selected.', true);
                return;
            }
            const saveToVault = this.saveToVaultCheckbox.checked;
            if (saveToVault && !localStorage.getItem('vault_password_hash')) {
                alert('Please set a vault password in Settings first.');
                return;
            }
            this.convertBtn.disabled = true;
            const originalHTML = this.convertBtn.innerHTML;
            this.convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-pulse"></i> Converting...';
            const success = await this.pdfConverter.startConversion(
                this.selectedFile,
                this.currentFormat,
                saveToVault,
                this.setStatus
            );
            if (success) {
                this.renderAllFiles();
                this.renderRecentFiles();
            }
            this.convertBtn.disabled = false;
            this.convertBtn.innerHTML = originalHTML;
        });

        // Image upload
        this.imageUploadArea.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            for (let file of files) {
                if (file.type.startsWith('image/')) this.selectedImages.push(file);
            }
            this.updateImagePreview();
            this.imageInput.value = '';
        });
        this.clearImagesBtn.addEventListener('click', () => {
            this.selectedImages = [];
            this.updateImagePreview();
        });

        // Images to PDF convert
        this.imagesToPdfBtn.addEventListener('click', async () => {
            const saveToVault = this.imageToVaultCheckbox.checked;
            if (saveToVault && !localStorage.getItem('vault_password_hash')) {
                alert('Please set a vault password in Settings first.');
                return;
            }
            this.imagesToPdfBtn.disabled = true;
            const originalText = this.imagesToPdfBtn.innerHTML;
            this.imagesToPdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-pulse"></i> Creating PDF...';
            const success = await this.imageToPdf.convert(
                this.selectedImages,
                this.pageSizeSelect.value,
                this.orientationSelect.value,
                saveToVault,
                this.setStatus
            );
            if (success) {
                this.selectedImages = [];
                this.updateImagePreview();
                this.renderAllFiles();
                this.renderRecentFiles();
            }
            this.imagesToPdfBtn.disabled = false;
            this.imagesToPdfBtn.innerHTML = originalText;
        });

        // Custom naming toggle
        this.customNamingToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            this.pdfConverter.customNamingEnabled = enabled;
            this.imageToPdf.customNamingEnabled = enabled;
            this.setStatus(`Custom naming ${enabled ? 'enabled' : 'disabled'}`, false);
        });

        // Vault
        this.unlockVaultBtn.addEventListener('click', async () => {
            const pwd = this.vaultPasswordInput.value;
            if (!pwd) return;
            const success = await this.vaultManager.unlock(pwd);
            if (success) {
                this.setStatus('Vault unlocked.', false);
                this.renderVaultFiles();
            } else {
                alert('Wrong password.');
            }
        });

        this.saveVaultPasswordBtn.addEventListener('click', async () => {
            const newPwd = this.vaultSetPassword.value;
            if (!newPwd) { alert('Enter a password.'); return; }
            await this.vaultManager.setPassword(newPwd);
            this.vaultSetPassword.value = '';
            this.renderVaultFiles();
        });

        this.clearVaultBtn.addEventListener('click', () => {
            if (!this.vaultManager.isUnlocked()) { alert('Vault locked.'); return; }
            if (confirm('Delete ALL files from vault?')) {
                this.vaultManager.clearAll();
                this.renderVaultFiles();
            }
        });

        // API Key & Endpoint
        this.apiKeyInput.addEventListener('change', () => {
            this.chatManager.saveConfig(this.apiKeyInput.value, this.apiEndpointInput.value);
        });
        this.apiEndpointInput.addEventListener('change', () => {
            this.chatManager.saveConfig(this.apiKeyInput.value, this.apiEndpointInput.value);
        });

        // Chat
        this.chatSendBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        this.clearChatBtn.addEventListener('click', () => {
            if (confirm('Clear entire chat history?')) {
                this.chatManager.clearHistory();
                this.renderChatMessages();
            }
        });

        // Clear files
        this.clearAllFilesBtn.addEventListener('click', () => {
            if (confirm('Delete all normal files?')) {
                this.fileManager.clearAll();
                this.renderAllFiles();
                this.renderRecentFiles();
            }
        });
        this.clearRecentBtn.addEventListener('click', () => {
            if (confirm('Delete all normal files?')) {
                this.fileManager.clearAll();
                this.renderAllFiles();
                this.renderRecentFiles();
            }
        });

        // Search
        this.fileSearchInput.addEventListener('input', () => this.renderAllFiles());

        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const screenId = item.getAttribute('data-screen');
                if (!screenId || !this.screens[screenId]) return;
                Object.values(this.screens).forEach(s => s.classList.remove('active'));
                this.screens[screenId].classList.add('active');
                this.navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                if (screenId === 'files-screen') this.renderAllFiles();
                if (screenId === 'home-screen') this.renderRecentFiles();
                if (screenId === 'vault-screen' && this.vaultManager.isUnlocked()) {
                    this.vaultManager.loadFiles();
                    this.renderVaultFiles();
                }
                if (screenId === 'chat-screen') this.renderChatMessages();
            });
        });

        // GitHub button
        document.getElementById('githubBtn').addEventListener('click', () => {
            window.open('https://github.com/Ottahen', '_blank');
        });

        // Premium fake button
        document.getElementById('premiumFakeBtn').addEventListener('click', () => {
            this.setStatus('All features are already free and client‑side!', false);
        });
    }

    handleFileSelect(file) {
        if (!file || file.type !== 'application/pdf') {
            this.setStatus('Invalid PDF file.', true);
            this.selectedFile = null;
            this.filePreview.style.display = 'none';
            return false;
        }
        if (file.size > 30 * 1024 * 1024) {
            this.setStatus('File exceeds 30MB limit.', true);
            this.selectedFile = null;
            this.filePreview.style.display = 'none';
            return false;
        }
        this.selectedFile = file;
        this.fileNameSpan.innerText = file.name.length > 28 ? file.name.slice(0, 25) + '...' : file.name;
        this.filePreview.style.display = 'inline-flex';
        this.setStatus(`Loaded: ${file.name} · Ready for ${this.currentFormat.toUpperCase()}`, false);
        return true;
    }

    setStatus(message, isError = false, isLoading = false) {
        this.statusText.innerText = message;
        if (isError) {
            this.statusIcon.className = 'fas fa-exclamation-triangle';
            this.statusIcon.style.color = '#dc2626';
            this.statusIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        } else if (isLoading) {
            this.statusIcon.innerHTML = '<div class="loader-mini"></div>';
            this.statusIcon.style.color = '#f39c12';
        } else {
            this.statusIcon.className = 'fa-regular fa-heart';
            this.statusIcon.innerHTML = '<i class="fa-regular fa-heart"></i>';
            this.statusIcon.style.color = '#f39c12';
        }
    }

    loadAPIConfig() {
        const key = localStorage.getItem('api_key');
        const endpoint = localStorage.getItem('api_endpoint');
        if (key) this.apiKeyInput.value = key;
        if (endpoint) this.apiEndpointInput.value = endpoint;
        this.chatManager.loadConfig();
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'docx') return '<i class="fa-regular fa-file-word"></i>';
        if (ext === 'html') return '<i class="fa-solid fa-code"></i>';
        if (ext === 'txt') return '<i class="fa-regular fa-file-lines"></i>';
        if (ext === 'zip') return '<i class="fa-regular fa-file-zipper"></i>';
        if (ext === 'pdf') return '<i class="fa-regular fa-file-pdf"></i>';
        return '<i class="fa-regular fa-file"></i>';
    }

    formatDate(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString();
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    escapeHtml(str) {
        return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    renderAllFiles() {
        const files = this.fileManager.getFiles();
        const searchTerm = this.fileSearchInput?.value.toLowerCase() || '';
        let filtered = files;
        if (searchTerm) filtered = files.filter(f => f.name.toLowerCase().includes(searchTerm));
        if (this.fileCount) this.fileCount.innerText = filtered.length;
        if (filtered.length === 0) {
            this.allFilesContainer.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>No generated files yet.</p></div>`;
            return;
        }
        this.allFilesContainer.innerHTML = filtered.map(file => `
            <div class="file-card">
                <div class="file-thumb">${this.getFileIcon(file.name)}</div>
                <div class="file-info">
                    <h4>${this.escapeHtml(file.name)}</h4>
                    <p>${this.formatDate(file.date)} · ${this.formatSize(file.size)}</p>
                </div>
                <div class="file-actions">
                    <i class="fa-solid fa-download" onclick="window.downloadFileById('${file.id}')"></i>
                    <i class="fa-solid fa-lock" onclick="window.moveToVault('${file.id}')" title="Move to Secret Vault"></i>
                    <i class="fa-solid fa-trash-can" onclick="window.deleteFileById('${file.id}')"></i>
                </div>
            </div>
        `).join('');

        // Expose functions for onclick
        window.downloadFileById = (id) => {
            const file = this.fileManager.getFile(id);
            if (file && file.blobUrl) {
                const a = document.createElement('a');
                a.href = file.blobUrl;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        };
        window.deleteFileById = (id) => {
            this.fileManager.deleteFile(id);
            this.renderAllFiles();
            this.renderRecentFiles();
        };
        window.moveToVault = async (id) => {
            const file = this.fileManager.getFile(id);
            if (!file) return;
            if (!localStorage.getItem('vault_password_hash')) {
                alert('Please set a vault password in Settings first.');
                return;
            }
            const blob = await fetch(file.blobUrl).then(r => r.blob());
            const arrayBuffer = await blob.arrayBuffer();
            const success = await this.vaultManager.encryptAndStore(file.name, arrayBuffer, file.size, file.mimeType);
            if (success) {
                this.fileManager.deleteFile(id);
                this.renderAllFiles();
                this.renderRecentFiles();
                alert(`"${file.name}" moved to Secret Vault.`);
            } else {
                alert('Failed to encrypt file. Wrong password?');
            }
        };
    }

    renderRecentFiles() {
        const files = this.fileManager.getFiles().slice(0, 5);
        if (files.length === 0) {
            this.recentFilesContainer.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>No files yet. Convert a PDF or create PDF from images.</p></div>`;
            return;
        }
        this.recentFilesContainer.innerHTML = files.map(file => `
            <div class="file-card">
                <div class="file-thumb">${this.getFileIcon(file.name)}</div>
                <div class="file-info">
                    <h4>${this.escapeHtml(file.name.length > 30 ? file.name.slice(0,27)+'...' : file.name)}</h4>
                    <p>${this.formatDate(file.date)} · ${this.formatSize(file.size)}</p>
                </div>
                <div class="file-actions">
                    <i class="fa-solid fa-download" onclick="window.downloadFileById('${file.id}')"></i>
                    <i class="fa-solid fa-lock" onclick="window.moveToVault('${file.id}')" title="Move to Secret Vault"></i>
                    <i class="fa-solid fa-trash-can" onclick="window.deleteFileById('${file.id}')"></i>
                </div>
            </div>
        `).join('');
        // Reuse global functions from renderAllFiles
    }

    renderVaultFiles() {
        if (!this.vaultManager.isUnlocked()) {
            this.vaultFilesContainer.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-lock"></i><p>Enter password to unlock vault.</p></div>`;
            return;
        }
        const files = this.vaultManager.getFiles();
        if (files.length === 0) {
            this.vaultFilesContainer.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Vault is empty. Move files from Files screen.</p></div>`;
            return;
        }
        this.vaultFilesContainer.innerHTML = files.map(file => `
            <div class="file-card">
                <div class="file-thumb">${this.getFileIcon(file.name)}</div>
                <div class="file-info">
                    <h4>${this.escapeHtml(file.name)}</h4>
                    <p>${this.formatDate(new Date(file.date))} · ${this.formatSize(file.size)}</p>
                </div>
                <div class="file-actions">
                    <i class="fa-solid fa-download" onclick="window.downloadVaultFile('${file.id}')"></i>
                    <i class="fa-solid fa-trash-can" onclick="window.deleteVaultFile('${file.id}')"></i>
                </div>
            </div>
        `).join('');

        window.downloadVaultFile = async (id) => {
            const file = this.vaultManager.getFile(id);
            if (!file) return;
            if (!this.vaultManager.isUnlocked()) { alert('Vault locked.'); return; }
            const password = prompt('Enter vault password to download:');
            if (!password) return;
            const blob = await this.vaultManager.decryptFile(file, password);
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                alert('Wrong password or corrupted file.');
            }
        };
        window.deleteVaultFile = (id) => {
            if (!this.vaultManager.isUnlocked()) { alert('Vault locked.'); return; }
            if (confirm('Delete this file from vault permanently?')) {
                this.vaultManager.deleteFile(id);
                this.renderVaultFiles();
            }
        };
    }

    renderChatMessages() {
        const history = this.chatManager.getHistory();
        if (history.length === 0) {
            this.chatMessagesContainer.innerHTML = `<div class="empty-state"><i class="fa-regular fa-comment"></i><p>Start a conversation. Set API key in Settings.</p></div>`;
            return;
        }
        this.chatMessagesContainer.innerHTML = history.map(msg => `
            <div class="chat-message ${msg.role}">
                <div class="role-label">${msg.role === 'user' ? 'You' : 'Chaton Fat'}</div>
                ${this.escapeHtml(msg.content)}
            </div>
        `).join('');
        const container = this.chatMessagesContainer.closest('.scroll-area');
        if (container) container.scrollTop = container.scrollHeight;
    }

    async sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        this.chatInput.value = '';
        this.chatSendBtn.disabled = true;
        this.chatSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-pulse"></i>';
        await this.chatManager.sendMessage(message, this.setStatus, () => {
            this.renderChatMessages();
        });
        this.chatSendBtn.disabled = false;
        this.chatSendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
        this.renderChatMessages();
    }

    updateImagePreview() {
        if (this.selectedImages.length === 0) {
            this.imagePreviewList.style.display = 'none';
            this.imagePreviewList.innerHTML = '';
            return;
        }
        this.imagePreviewList.style.display = 'block';
        this.imagePreviewList.innerHTML = this.selectedImages.map((img, idx) =>
            `<div class="image-preview-item"><span><i class="fa-regular fa-image"></i> ${this.escapeHtml(img.name)} (${this.formatSize(img.size)})</span><i class="fa-solid fa-trash-can" style="cursor:pointer;color:#e53e3e;" onclick="window.removeImage(${idx})"></i></div>`
        ).join('');
        window.removeImage = (idx) => {
            this.selectedImages.splice(idx, 1);
            this.updateImagePreview();
        };
    }
}