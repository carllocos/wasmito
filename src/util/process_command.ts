import { type ExecException, exec } from 'child_process';
import { getGlobalLogger } from '../logger/logger';

export async function runCommand(
  command: string,
  execOpts: object = {},
): Promise<[string, string, ExecException | null]> {
  const resp = await new Promise<[string, string, ExecException | null]>(
    (resolve) => {
      getGlobalLogger().info(`Running command: ${command}`);
      exec(command, execOpts, (error, stdout, stderr) => {
        resolve([stdout, stderr, error]);
      });
    },
  );
  return resp;
}
