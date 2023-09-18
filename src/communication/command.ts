import { type APIRequest } from '../warduino/api/request_interface'
import { type Channel } from './channel_interface'

type FutureResolver<T> = (value: T | PromiseLike<T>) => void
type FutureRejecotor = (reason?: any) => void

export class Command<T> {
  private readonly connection: Channel
  private readonly request: APIRequest<T>
  private requestResolver: FutureResolver<T> | undefined
  private requestRejector: FutureRejecotor | undefined

  constructor (connection: Channel, request: APIRequest<T>) {
    this.connection = connection
    this.request = request
  }

  update (data: string): void {
    try {
      if (this.requestResolver != null) {
        this.requestResolver(this.request.parse(data))
      }
    } catch (APIRequestInvalidParse) {
    } finally {
      this.connection.removeOnData(this.update)
    }
  }

  async execute (): Promise<T> {
    return await new Promise((resolve, reject) => {
      this.requestResolver = resolve
      this.requestRejector = reject
      const d = this.request.getData() + '\n'
      this.connection.addOnData(this.update)
      void this.connection.send(d) // void to cancel terun
    })
  }
}
