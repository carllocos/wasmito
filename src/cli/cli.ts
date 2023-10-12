import { program } from 'commander';
import * as figlet from 'figlet';
import {
  readProjectVersionNumber,
  readProjectDescription,
  readProjectName,
} from './project_config';

program
  .version(readProjectVersionNumber())
  .description(readProjectDescription())
  .parse(process.argv);

console.log(figlet.textSync(readProjectName()));
