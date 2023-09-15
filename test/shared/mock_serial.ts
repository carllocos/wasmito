import { Channel } from "../../src/communication/channel_interface";

export class MockSerialConnection implements Channel {
    private callbacks: ((data: string) => void)[];

    constructor(port: string, baudrate: number) {
        this.callbacks = [];
    }

    async open(): Promise<void> {
        return;
    }

    async close(): Promise<void> {
        return;
    }

    async send(data: string): Promise<void> {
        return;
    }

    addOnData(callback: (data: string) => void): void {
        this.callbacks.push(callback);
    }

    removeOnData(callback: (data: string) => void): void {
        this.callbacks = this.callbacks.filter((c) => c !== callback);
    }

    triggerData(data: string): void {
        this.callbacks.forEach(cb => cb(data));
    }
}