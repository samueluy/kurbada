export function createId(_prefix?: string) {
  const randomHex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');

  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-a${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`;
}
