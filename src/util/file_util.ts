import * as path from 'path';

export function replaceFileExtension(
  filePath: string,
  newExtension: string,
): string {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);
  const filePathWithoutFile = path.dirname(filePath);
  return path.join(filePathWithoutFile, `${fileNameWithoutExt}${newExtension}`);
}
