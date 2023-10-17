import * as portFinder from 'portfinder';
import * as net from 'net';
import { getGlobalLogger } from '../logger/logger';

export async function isPortInUse(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port, '127.0.0.1');
  });
}

export async function getFreePort(): Promise<number | undefined> {
  return await new Promise((resolve) => {
    portFinder.getPort((err, port) => {
      if (err !== undefined) {
        resolve(port);
      } else {
        resolve(undefined);
      }
    });
  });
}

export async function waitForPortToBeUsed(
  port: number,
  host: string,
  maxWaitTime?: number,
): Promise<boolean> {
  return await new Promise((resolve) => {
    const checkInterval = 1000; // Interval to check if the port is in use (in milliseconds)
    let firstTryDone = false;
    let totalTimeWaited = 0;

    const checkPort: () => void = () => {
      const client = new net.Socket();

      client.on('error', () => {
        if (
          firstTryDone &&
          maxWaitTime !== undefined &&
          maxWaitTime <= totalTimeWaited
        ) {
          resolve(false);
        }

        setTimeout(() => {
          firstTryDone = true;
          totalTimeWaited += checkInterval;
          checkPort();
        }, checkInterval);
      });

      client.on('connect', () => {
        getGlobalLogger().debug(`Port to be used took ${totalTimeWaited}ms`);
        client.destroy();
        resolve(true);
      });

      client.connect(port, host);
    };

    checkPort();
  });
}
