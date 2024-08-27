import { type Command } from 'commander';
import { isDirectoryPath, pathJoin } from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { mkdirSync, rmdirSync } from 'fs';

export const projectDirName = '.wasmito_project';

export function registerProjectCommand(program: Command): void {
  program
    .command('project')
    .description(`create and deploy a project on a mcu`)
    .option('--new', `create an empty project`)
    .option(
      '--rmv',
      'delete the project configuration in the current working directory',
    )
    .action((options) => {
      const logger = getGlobalLogger();
      const wd = process.cwd();
      const targetDir = pathJoin(wd, projectDirName);

      if (options.new !== undefined) {
        if (isDirectoryPath(targetDir)) {
          program.error(
            `The current working directory has already a project set on ${targetDir}. To delete project run 'project --rmv'`,
          );
        } else {
          mkdirSync(targetDir);
          if (isDirectoryPath(targetDir)) {
            logger.info(`Project directory ${targetDir} created`);
          } else {
            program.error(`Failed to create project directory ${targetDir}`);
          }
        }
      } else if (options.rmv !== undefined) {
        if (isDirectoryPath(targetDir)) {
          rmdirSync(targetDir);
          if (isDirectoryPath(targetDir)) {
            program.error(`Failed to remove project directory ${targetDir}`);
          } else {
            logger.info(`Project directory ${targetDir} removed`);
          }
        } else {
          program.error(
            `the current working directory has no project to be removed set on ${targetDir}`,
          );
        }
      } else {
        program.error(`No action provided. write 'help project'`);
      }
    });
}
