import * as FileSystem from 'expo-file-system/legacy';

export async function salvarDataUrl(dataUrl: string, filename: string): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const uri = `${FileSystem.cacheDirectory || ''}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export function criarArquivoUpload(
  uri: string,
  name?: string | null,
  type?: string | null,
): { uri: string; name: string; type: string } {
  const safeName = name || `imagem-${Date.now()}.jpg`;
  return {
    uri,
    name: safeName,
    type: type || mimeTypePorExtensao(safeName),
  };
}

function mimeTypePorExtensao(nome: string): string {
  const lower = nome.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
