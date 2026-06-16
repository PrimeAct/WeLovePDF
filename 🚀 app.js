import { FileManager } from './modules/fileManager.js';
import { VaultManager } from './modules/vaultManager.js';
import { PDFConverter } from './modules/pdfConverter.js';
import { ImageToPDF } from './modules/imageToPdf.js';
import { ChatManager } from './modules/chatManager.js';
import { UIManager } from './modules/uiManager.js';

// Initialize all modules with dependency injection
const fileManager = new FileManager();
const vaultManager = new VaultManager();
const pdfConverter = new PDFConverter(fileManager, vaultManager);
const imageToPdf = new ImageToPDF(fileManager, vaultManager);
const chatManager = new ChatManager();

// UI Manager orchestrates everything
const uiManager = new UIManager(
    fileManager,
    vaultManager,
    pdfConverter,
    imageToPdf,
    chatManager
);

// Start the application
uiManager.init();