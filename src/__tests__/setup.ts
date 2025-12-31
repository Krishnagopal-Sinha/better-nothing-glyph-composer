/**
 * Test setup file for Vitest
 * Configures testing environment and global test utilities
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.showPopUp if it exists
(global as any).showPopUp = vi.fn();

// Mock URL.createObjectURL for jsdom environment
if (typeof URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = vi.fn((_blob: Blob) => {
    return `blob:http://localhost/${Math.random().toString(36).substring(7)}`;
  });
  global.URL.revokeObjectURL = vi.fn();
}

// Mock File.arrayBuffer() for test environment
if (typeof File.prototype.arrayBuffer === 'undefined') {
  File.prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          resolve(new ArrayBuffer(this.size || 352844));
        }
      };
      reader.onerror = () => {
        resolve(new ArrayBuffer(this.size || 352844));
      };
      try {
        reader.readAsArrayBuffer(this);
      } catch {
        resolve(new ArrayBuffer(this.size || 352844));
      }
    });
  };
}

// Mock AudioContext for test environment
if (typeof window.AudioContext === 'undefined') {
  (global as any).AudioContext = vi.fn().mockImplementation(() => ({
    decodeAudioData: vi.fn(async (_arrayBuffer: ArrayBuffer) => {
      const sampleRate = 44100;
      const duration = 5.0; // 5 seconds for metronome
      const numberOfChannels = 2;
      const length = sampleRate * duration;

      return {
        sampleRate,
        duration,
        numberOfChannels,
        length,
        getChannelData: vi.fn((_channelIndex: number) => {
          return new Float32Array(length).fill(0);
        }),
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn()
      };
    }),
    sampleRate: 44100,
    currentTime: 0,
    destination: {},
    state: 'running'
  }));
}

// Patch document.createElement to handle audio and canvas elements properly
const originalCreateElement = document.createElement.bind(document);
(document as any).createElement = function (tagName: string, options?: ElementCreationOptions) {
  const element = originalCreateElement(tagName, options);

  if (tagName.toLowerCase() === 'canvas') {
    // Mock getContext for canvas
    const canvasElement = element as HTMLCanvasElement;
    const originalGetContext = canvasElement.getContext.bind(canvasElement);
    (canvasElement as any).getContext = function (contextType: string, options?: any) {
      if (contextType === '2d') {
        return {
          canvas: element,
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(25 * 25 * 4).fill(128),
            width: 25,
            height: 25
          })),
          putImageData: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          scale: vi.fn()
        };
      }
      return originalGetContext(contextType, options);
    };

    // Mock toBlob
    canvasElement.toBlob = function (
      callback: (blob: Blob | null) => void,
      type?: string,
      _quality?: number
    ) {
      const pngData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x19, 0x00, 0x00, 0x00, 0x19, 0x08, 0x06, 0x00, 0x00, 0x00, 0xc4,
        0xb5, 0x6f, 0xa7
      ]);
      const blob = new Blob([pngData], { type: type || 'image/png' });
      setTimeout(() => callback(blob), 0);
    };
  }

  if (tagName.toLowerCase() === 'audio') {
    const audioElement = element as HTMLAudioElement;
    // Set duration property (5 seconds for metronome audio)
    Object.defineProperty(audioElement, 'duration', {
      get: () => 5.0,
      configurable: true,
      enumerable: true
    });

    // Store event listeners
    const listeners: Array<{ type: string; listener: EventListener }> = [];

    // Override addEventListener
    const originalAddEventListener = audioElement.addEventListener.bind(audioElement);
    const pendingListeners: Array<{ type: string; listener: any }> = [];
    (audioElement as any)._pendingListeners = pendingListeners;

    audioElement.addEventListener = function (
      type: string,
      listener: EventListener | EventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ) {
      if (listener) {
        if (typeof listener === 'function') {
          listeners.push({ type, listener });
          pendingListeners.push({ type, listener });
        }
      }
      originalAddEventListener(type, listener as EventListener, options);

      // Auto-trigger loadedmetadata for tests immediately
      if (type === 'loadedmetadata' && listener) {
        const event = new Event('loadedmetadata');
        if (typeof listener === 'function') {
          listener(event);
        } else if (listener && 'handleEvent' in listener) {
          listener.handleEvent(event);
        }
      }
    };

    // Override load to trigger loadedmetadata immediately (jsdom doesn't implement load)
    audioElement.load = function () {
      // Trigger immediately, not in setTimeout
      const event = new Event('loadedmetadata');
      // Trigger onloadedmetadata if set
      if ((audioElement as any).onloadedmetadata) {
        try {
          (audioElement as any).onloadedmetadata(event);
        } catch (e) {
          // Ignore errors
        }
      }
      // Trigger all loadedmetadata listeners
      listeners.forEach(({ type, listener }) => {
        if (type === 'loadedmetadata') {
          try {
            listener(event);
          } catch (e) {
            // Ignore errors
          }
        }
      });
      // Also check for any pending listeners added via addEventListener
      const pendingListeners = (audioElement as any)._pendingListeners || [];
      pendingListeners.forEach((l: any) => {
        if (l.type === 'loadedmetadata' && l.listener) {
          try {
            if (typeof l.listener === 'function') {
              l.listener(event);
            }
          } catch (e) {
            // Ignore errors
          }
        }
      });
    };
  }

  return element;
};
