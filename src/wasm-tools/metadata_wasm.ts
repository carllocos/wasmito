export async function getProducer(wasmFilePath: string): Promise<string> {
  const languageUsed = await readLanguageMetadata(wasmFilePath);
  return languageUsed ?? '';
}

export async function readLanguageMetadata(
  wasmFilePath: string,
): Promise<string | undefined> {
  return readMetadataWasm(wasmFilePath, 'language');
}

async function readMetadataWasm(
  _wasmFilePath: string,
  _metaDataOfInterest: string,
): Promise<string | undefined> {
  /*  This command produces a string of the following form.
   * metaDataOfInterest should be either 'language' or 'processed-by'
   * example command output:
   * 'module:
   *   language:
   *       Rust
   *   processed-by:
   *       rustc: 1.76.0 (07dca489a 2024-02-04)'
   */

  // TODO replace with actual data
  return 'Rust';
}
