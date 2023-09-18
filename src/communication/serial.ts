import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { type Channel } from './channel_interface'

export class SerialConnection implements Channel {
  private readonly port: SerialPort
  private callbacks: Array<(data: string) => void> = []

  constructor (portName: string, baudRate: number) {
    this.port = new SerialPort({
      path: portName,
      baudRate,
      autoOpen: false
    })
    this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
    this.setupEventListeners()
  }

  addOnData (callback: (data: string) => void): void {
    this.callbacks.push(callback)
  }

  removeOnData (callback: (data: string) => void): void {
    this.callbacks = this.callbacks.filter((c) => c !== callback)
  }

  async send (data: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (this.port.isOpen) {
        this.port.write(data, (err) => {
          if (err !== null) {
            reject(new Error(`Error sending data: ${err?.message}`))
          }
          resolve()
        })
      } else {
        reject(new Error('Serial port is not open.'))
      }
    })
  }

  async open (): Promise<void> {
    await new Promise((resolve, reject) => {})
  }

  async close (): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.port.close((err) => {
        if (err !== null) {
          console.error(`Error closing serial port: ${err.message}`)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  private setupEventListeners (): void {
    this.port.on('data', (data: Buffer) => {
      this.notifyCallbacks(data.toString())
    })

    // Handle errors
    this.port.on('error', (err: Error) => {
      console.error(`Serial port error: ${err.message}`)
    })

    // Open the serial port when the instance is created
    this.port.open((err) => {
      if (err !== null) {
        console.error(`Error opening serial port: ${err.message}`)
      } else {
        console.log('Serial port opened successfully.')
      }
    })
  }

  private notifyCallbacks (data: string): void {
    this.callbacks.forEach((cb) => { cb(data) })
  }
}
