
export class PCMAudioPlayer {
    private audioContext: AudioContext | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private audioBuffer: AudioBuffer | null = null;
    
    private startTime: number = 0;
    private pauseTime: number = 0;
    private isPaused: boolean = false;
    private onEndedCallback: (() => void) | null = null;

    constructor() {
        // Initialize context lazily or on demand
    }

    private initContext() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
    }

    public async load(base64Audio: string): Promise<number> {
        this.initContext();
        if (!this.audioContext) throw new Error("Audio Context not initialized");

        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const numChannels = 1;
        const sampleRate = 24000; // Gemini default
        
        const frameCount = dataInt16.length / numChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);
        
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        
        this.audioBuffer = buffer;
        this.pauseTime = 0;
        return this.audioBuffer.duration;
    }

    public play(onEnded?: () => void) {
        if (!this.audioContext || !this.audioBuffer) return;

        // If reusing context that was suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch (e) { /* ignore */ }
        }

        this.onEndedCallback = onEnded || null;

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        
        this.gainNode = this.audioContext.createGain();
        // Set default volume or restored volume could be passed here, 
        // but generally we handle volume via setVolume separately.
        
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        // Start playback from the pause position (or 0)
        const offset = this.pauseTime;
        this.sourceNode.start(0, offset);
        
        this.startTime = this.audioContext.currentTime - offset;
        this.isPaused = false;

        this.sourceNode.onended = () => {
            // Only fire callback if we reached the end naturally, not if we stopped/paused manually
            // We can check this by calculating if (currentTime - startTime) >= duration
            // But simplified: the component handles explicit stops. 
            // We just trigger callback.
            if (!this.isPaused && this.onEndedCallback) {
                this.onEndedCallback();
            }
        };
    }

    public pause() {
        if (!this.sourceNode || !this.audioContext || this.isPaused) return;

        try {
            this.sourceNode.stop();
            this.pauseTime = this.audioContext.currentTime - this.startTime;
            this.isPaused = true;
        } catch(e) {
            console.error("Error pausing:", e);
        }
    }

    public stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch (e) { /* ignore */ }
            this.sourceNode = null;
        }
        this.pauseTime = 0;
        this.isPaused = false;
    }

    public seek(time: number) {
        if (!this.audioContext || !this.audioBuffer) return;
        
        const wasPlaying = !this.isPaused && !!this.sourceNode;
        
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch(e) {}
            this.sourceNode = null;
        }

        this.pauseTime = time; // Set offset
        
        // If it was playing, restart immediately at new time
        if (wasPlaying) {
            this.play(this.onEndedCallback || undefined);
        } else {
            // Just update state, don't auto play
            this.isPaused = true; 
        }
    }

    public setVolume(value: number) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(value, this.audioContext?.currentTime || 0);
        }
    }

    public getCurrentTime(): number {
        if (!this.audioContext || this.isPaused) {
            return this.pauseTime;
        }
        const t = this.audioContext.currentTime - this.startTime;
        // Clamp to duration
        return this.audioBuffer ? Math.min(t, this.audioBuffer.duration) : 0;
    }

    public getDuration(): number {
        return this.audioBuffer?.duration || 0;
    }

    public close() {
        this.stop();
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Helpers for Live Streaming API (Raw PCM processing)

export function base64ToPcm(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function pcmToBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
