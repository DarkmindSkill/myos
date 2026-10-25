import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
const CURRENCY_SYMBOLS = {
    LKR: 'Rs.',
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
};
export function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || 'Rs.';
}
export function formatMoney(amount, currency = 'LKR') {
    const safe = Number.isFinite(amount) ? amount : 0;
    const formatted = safe.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const sym = getCurrencySymbol(currency);
    return sym === 'Rs.' ? `${sym} ${formatted}` : `${sym}${formatted}`;
}
export function toJsDate(val) {
    if (!val)
        return new Date();
    if (val instanceof Date)
        return val;
    if (typeof val.toDate === 'function') {
        return val.toDate();
    }
    return new Date();
}
export function formatDateTime(val) {
    const d = toJsDate(val);
    return d.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomToken(len) {
    let out = '';
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
    if (cryptoObj && cryptoObj.getRandomValues) {
        const arr = new Uint8Array(len);
        cryptoObj.getRandomValues(arr);
        for (let i = 0; i < len; i++) {
            out += SAFE_ALPHABET[arr[i] % SAFE_ALPHABET.length];
        }
        return out;
    }
    for (let i = 0; i < len; i++) {
        out += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
    }
    return out;
}
export function generateUniqueQrCode() {
    return `KPOS-${randomToken(8)}`;
}
export function generateSku() {
    return `SKU-${randomToken(5)}`;
}
export function generateInvoiceNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `INV-${y}${m}${d}-${randomToken(4)}`;
}
export async function generateQrDataUrl(text, width = 180) {
    try {
        return await QRCode.toDataURL(text, {
            width,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });
    }
    catch {
        return '';
    }
}
let sharedAudioCtx = null;
export function playScanBeep(kind = 'success') {
    try {
        if (typeof window === 'undefined')
            return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx)
            return;
        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioCtx();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => { });
        }
        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        const now = sharedAudioCtx.currentTime;
        if (kind === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, now); // C6 crisp POS beep
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.start(now);
            osc.stop(now + 0.09);
        }
        else if (kind === 'reprice') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1318.5, now + 0.06);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.start(now);
            osc.stop(now + 0.14);
        }
        else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        }
    }
    catch {
        // Ignore audio context restrictions
    }
}
/**
 * Listens for USB / Bluetooth HID barcode & QR scanners (rapid keyboard bursts ending in Enter).
 */
export function useHardwareScanner(onScan, enabled = true) {
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const callbackRef = useRef(onScan);
    callbackRef.current = onScan;
    useEffect(() => {
        if (!enabled)
            return;
        const handleKeyDown = (e) => {
            const target = e.target;
            if (target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)) {
                return;
            }
            const now = Date.now();
            if (now - lastKeyTimeRef.current > 85) {
                bufferRef.current = '';
            }
            lastKeyTimeRef.current = now;
            if (e.key === 'Enter') {
                const scanned = bufferRef.current.trim();
                bufferRef.current = '';
                if (scanned.length >= 4) {
                    e.preventDefault();
                    callbackRef.current(scanned);
                }
            }
            else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                bufferRef.current += e.key;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled]);
}
