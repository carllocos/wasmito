import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { Channel } from './channel_interface';

export class SerialConnection implements Channel {
    private port: SerialPort;
    private callbacks: ((data: string) => void)[] = [];

    constructor(portName: string, baudRate: number) {
        this.port = new SerialPort({
            path: portName, baudRate: baudRate,
            autoOpen: false,
        });
        this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
        this.setupEventListeners();
    }

    addOnData(callback: (data: string) => void) {
        this.callbacks.push(callback);
    }

    removeOnData(callback: (data: string) => void) {
        this.callbacks = this.callbacks.filter((c) => c !== callback);
    }

    send(data: string): Promise<void> {
        return new Promise((res, rej) => {
            if (this.port.isOpen) {
                this.port.write(data, (err) => {
                    if (err) {
                        rej(new Error(`Error sending data: ${err.message}`));
                    }
                    res()
                });
            } else {
                rej(new Error('Serial port is not open.'));
            }
        })
    }

    open(): Promise<void> {
        return new Promise((res, rej) => {

        })
    }

    close(): Promise<void> {
        return new Promise((res, rej) => {
            this.port.close((err) => {
                if (err) {
                    console.error(`Error closing serial port: ${err.message}`);
                    rej(err);
                } else {
                    res();
                }
            });
        })
    }

    private setupEventListeners() {
        this.port.on('data', (data: Buffer) => {
            this.notifyCallbacks(data.toString());
        });

        // Handle errors
        this.port.on('error', (err: Error) => {
            console.error(`Serial port error: ${err.message}`);
        });

        // Open the serial port when the instance is created
        this.port.open((err) => {
            if (err) {
                console.error(`Error opening serial port: ${err.message}`);
            } else {
                console.log(`Serial port opened successfully.`);
            }
        });
    }

    private notifyCallbacks(data: string) {
        this.callbacks.forEach((cb) => cb(data));
    }
}