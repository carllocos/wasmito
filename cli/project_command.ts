import { type Command } from 'commander';
import { isDirectoryPath, pathJoin } from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { mkdirSync, rmdirSync } from 'fs';

export function registerProjectCommand(program: Command): void {
  program
    .command('project')
    .description(`create and deploy a project on a mcu`)
    .option('--new', `create an empty project in the current working directory`)
    .option(
      '--rmv',
      'delete the project configuration in the current working directory',
    )
    .action((options) => {
      const logger = getGlobalLogger();
      const targetDir = getProjectDir();

      if (options.new !== undefined) {
        if (isProjectDirPresent()) {
          program.error(
            `The current working directory has already a project set on ${targetDir}. To delete project run 'project --rmv'`,
          );
        } else {
          mkdirSync(targetDir);
          if (isProjectDirPresent()) {
            logger.info(`Project directory ${targetDir} created`);
          } else {
            program.error(`Failed to create project directory ${targetDir}`);
          }
        }
      } else if (options.rmv !== undefined) {
        if (isProjectDirPresent()) {
          rmdirSync(targetDir);
          if (isProjectDirPresent()) {
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

export function isProjectDirPresent(): boolean {
  return isDirectoryPath(getProjectDir());
}

export function getProjectDir(): string {
  const projectDirName = '.wasmito_project';
  const cwd = process.cwd();
  return pathJoin(cwd, projectDirName);
}
