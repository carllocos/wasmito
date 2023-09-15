import { SerialPort } from 'serialport';
import { ObsersableChannel, ObserverChannel } from './observer_interface';

export class SerialConnection implements ObsersableChannel {
    private port: SerialPort;
    private observers: ObserverChannel[] = [];

    constructor(portName: string, baudRate: number) {
        this.port = new SerialPort({
            path: portName, baudRate: baudRate,
            autoOpen: false,
        });
        this.setupEventListeners();
    }

    addObserver(observer: ObserverChannel) {
        this.observers.push(observer);
    }

    removeObserver(observer: ObserverChannel) {
        this.observers = this.observers.filter((o) => o !== observer);
    }

    sendData(data: string) {
        if (this.port.isOpen) {
            this.port.write(data, (err) => {
                if (err) {
                    throw Error(`Error sending data: ${err.message}`);
                }
            });
        } else {
            throw Error('Serial port is not open.');
        }
    }

    close() {
        this.port.close((err) => {
            if (err) {
                console.error(`Error closing serial port: ${err.message}`);
            } else {
                console.log('Serial port closed.');
            }
        });
    }

    private setupEventListeners() {
        this.port.on('data', (data: Buffer) => {
            this.notifyObservers(data.toString());
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

    private notifyObservers(data: string) {
        this.observers.forEach((observer) => observer.update(data));
    }
}