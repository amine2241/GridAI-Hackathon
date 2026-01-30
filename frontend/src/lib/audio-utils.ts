export class PCMPlayer {
    private context: AudioContext | null = null;
    private startTime: number = 0;
    private sampleRate: number;
    private debug: boolean = true;
    private scheduledSources: AudioBufferSourceNode[] = [];

    constructor(sampleRate: number = 16000) {
        this.sampleRate = sampleRate;
    }

    private initContext() {
        try {
            if (!this.context) {
                this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
                    sampleRate: this.sampleRate
                });
                this.startTime = this.context.currentTime;
            }
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
        } catch (e) {
            // Error handled silently
        }
    }

    playChunk(chunk: Int16Array) {
        this.initContext();
        if (!this.context) return;

        if (this.debug && Math.random() < 0.01) { // Log occasionally
            console.log("[PCMPlayer] Playing chunk, size:", chunk.length);
        }

        const float32Data = new Float32Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
            float32Data[i] = chunk[i] / 32768.0;
        }

        const buffer = this.context.createBuffer(1, float32Data.length, this.sampleRate);
        buffer.getChannelData(0).set(float32Data);

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);

        const now = this.context.currentTime;
        // If we fall behind, catch up to 'now'
        if (this.startTime < now) {
            if (this.debug && this.startTime !== 0) {
                console.warn("[PCMPlayer] Buffer underrun, catching up. Gap:", now - this.startTime);
            }
            this.startTime = now;
        }

        // Track scheduled sources
        this.scheduledSources.push(source);
        source.onended = () => {
            const index = this.scheduledSources.indexOf(source);
            if (index > -1) {
                this.scheduledSources.splice(index, 1);
            }
        };

        source.start(this.startTime);
        this.startTime += buffer.duration;
    }

    clearBuffer() {
        // Stop all scheduled audio sources immediately
        this.scheduledSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Source may have already ended
            }
        });
        this.scheduledSources = [];

        // Reset timing to current time
        if (this.context) {
            this.startTime = this.context.currentTime;
        }
    }

    stop() {
        this.clearBuffer();
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}

export class PCMCapturer {
    private context: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private onData: (data: Int16Array) => void;

    constructor(onData: (data: Int16Array) => void) {
        this.onData = onData;
    }

    async start() {
        console.log("[PCMCapturer] Starting capture...");
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("[PCMCapturer] MediaStream acquired.");

            this.context = new AudioContext({ sampleRate: 16000 });
            console.log("[PCMCapturer] AudioContext created. State:", this.context.state);

            if (this.context.state === 'suspended') {
                await this.context.resume();
                console.log("[PCMCapturer] AudioContext resumed.");
            }

            this.source = this.context.createMediaStreamSource(this.stream);

            // Use ScriptProcessor for high compatibility
            this.processor = this.context.createScriptProcessor(4096, 1, 1);

            this.source.connect(this.processor);
            this.processor.connect(this.context.destination);

            this.processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                this.onData(int16Data);
            };
            console.log("[PCMCapturer] Capture pipeline active.");
        } catch (e) {
            console.error("[PCMCapturer] Error starting capture:", e);
            throw e;
        }
    }

    stop() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}
