import * as fs from 'fs';

let packageConfig: any;

function readPackageJSON(): void {
  if (packageConfig === undefined) {
    const packageJson = fs.readFileSync('package.json', 'utf8');
    packageConfig = JSON.parse(packageJson);
  }
}

export function readProjectVersionNumber(): string {
  try {
    readPackageJSON();
    return packageConfig.version;
  } catch (error) {
    return 'Invalid project nr';
  }
}

export function readProjectDescription(): string {
  try {
    readPackageJSON();
    return packageConfig.description;
  } catch (error) {
    return 'Invalid project description';
  }
}

export function readProjectName(): string {
  try {
    readPackageJSON();
    return packageConfig.name;
  } catch (error) {
    return 'Error in Name';
  }
}
