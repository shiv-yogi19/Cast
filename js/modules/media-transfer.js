/**
 * CAST — Media Transfer & Chunk Streaming Engine
 * Chunked file streaming over WebRTC DataChannel with progress tracking,
 * memory safety, Object URL lifecycle management, and format detection.
 */

import { pairing } from './pairing.js';

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks for high reliability over WebRTC DataChannel

export class MediaTransferEngine {
  constructor() {
    this.activeTransfers = new Map();
    this.incomingTransfers = new Map();
    this.objectUrls = new Set();
    this.listeners = new Map();

    this.bindPairingMessages();
  }

  bindPairingMessages() {
    pairing.on('message', (packet) => {
      if (!packet) return;

      if (packet.type === 'file-meta') {
        this.handleIncomingMeta(packet);
      } else if (packet.type === 'file-chunk') {
        this.handleIncomingChunk(packet);
      } else if (packet.type === 'file-complete') {
        this.handleIncomingComplete(packet);
      }
    });
  }

  // Detect supported media types and return human-readable metadata
  inspectFile(file) {
    const name = file.name;
    const size = file.size;
    const ext = name.split('.').pop().toLowerCase();
    
    let category = 'other';
    let mime = file.type || '';

    if (/\.(mp4|webm|mkv|mov|m4v)$/i.test(name) || mime.startsWith('video/')) {
      category = 'movie';
    } else if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name) || mime.startsWith('audio/')) {
      category = 'music';
    } else if (/\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name) || mime.startsWith('image/')) {
      category = 'image';
    } else if (/\.pdf$/i.test(name) || mime === 'application/pdf') {
      category = 'pdf';
    } else if (/\.(txt|md|json|log|csv)$/i.test(name) || mime.startsWith('text/')) {
      category = 'document';
    }

    return {
      name,
      size,
      formattedSize: this.formatBytes(size),
      category,
      ext,
      mime: mime || `application/${ext}`,
    };
  }

  formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Creates an Object URL and tracks it for future memory cleanup
  createTrackedUrl(blobOrFile) {
    const url = URL.createObjectURL(blobOrFile);
    this.objectUrls.add(url);
    return url;
  }

  revokeTrackedUrl(url) {
    if (this.objectUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(url);
    }
  }

  cleanupAllUrls() {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls.clear();
  }

  // Stream a local file to paired receiver in chunks
  async sendFile(file, category = 'movie') {
    const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
    const meta = this.inspectFile(file);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Send metadata announcement
    pairing.sendPacket({
      type: 'file-meta',
      fileId,
      category,
      name: meta.name,
      size: meta.size,
      formattedSize: meta.formattedSize,
      mime: meta.mime,
      totalChunks,
    });

    this.emit('transfer-started', { fileId, name: meta.name, totalChunks });

    // 2. Read and send in chunks with rate control
    const reader = new FileReader();
    let currentChunk = 0;

    const sendNextChunk = () => {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const slice = file.slice(start, end);

      reader.onload = (e) => {
        const base64Data = e.target.result.split(',')[1];
        pairing.sendPacket({
          type: 'file-chunk',
          fileId,
          chunkIndex: currentChunk,
          data: base64Data,
        });

        currentChunk++;
        const progress = Math.round((currentChunk / totalChunks) * 100);
        this.emit('transfer-progress', { fileId, progress, currentChunk, totalChunks });

        if (currentChunk < totalChunks) {
          // Controlled buffer delay
          setTimeout(sendNextChunk, 8);
        } else {
          // Finished sending
          pairing.sendPacket({
            type: 'file-complete',
            fileId,
          });
          this.emit('transfer-completed', { fileId, name: meta.name });
        }
      };

      reader.readAsDataURL(slice);
    };

    sendNextChunk();
    return fileId;
  }

  // Handle incoming stream from sender
  handleIncomingMeta(packet) {
    this.incomingTransfers.set(packet.fileId, {
      meta: packet,
      receivedChunks: [],
      receivedCount: 0,
      totalChunks: packet.totalChunks,
    });

    this.emit('incoming-started', packet);
  }

  handleIncomingChunk(packet) {
    const transfer = this.incomingTransfers.get(packet.fileId);
    if (!transfer) return;

    transfer.receivedChunks[packet.chunkIndex] = packet.data;
    transfer.receivedCount++;

    const progress = Math.round((transfer.receivedCount / transfer.totalChunks) * 100);
    this.emit('incoming-progress', {
      fileId: packet.fileId,
      progress,
      receivedCount: transfer.receivedCount,
      totalChunks: transfer.totalChunks,
    });
  }

  handleIncomingComplete(packet) {
    const transfer = this.incomingTransfers.get(packet.fileId);
    if (!transfer) return;

    try {
      // Reassemble binary Blob from Base64 chunks
      const byteArrays = [];
      for (let i = 0; i < transfer.receivedChunks.length; i++) {
        const b64 = transfer.receivedChunks[i];
        if (!b64) continue;
        const byteCharacters = atob(b64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const mimeType = transfer.meta.mime || 'application/octet-stream';
      const fileBlob = new Blob(byteArrays, { type: mimeType });
      const objectUrl = this.createTrackedUrl(fileBlob);

      const completeItem = {
        fileId: packet.fileId,
        name: transfer.meta.name,
        category: transfer.meta.category,
        size: transfer.meta.size,
        formattedSize: transfer.meta.formattedSize,
        blob: fileBlob,
        url: objectUrl,
      };

      this.emit('media-ready', completeItem);
      this.incomingTransfers.delete(packet.fileId);
    } catch (e) {
      console.error('Failed to assemble transferred file:', e);
      this.emit('transfer-error', { fileId: packet.fileId, error: e.message });
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(fn => {
        try { fn(data); } catch (e) { console.error(e); }
      });
    }
  }
}

export const mediaTransfer = new MediaTransferEngine();
