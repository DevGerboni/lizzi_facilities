import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';

export async function escolherImagens(multiplas = false): Promise<ImagePickerAsset[]> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error('Permita acesso às fotos para anexar imagens.');
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiplas,
    quality: 0.8,
    selectionLimit: multiplas ? 10 : 1,
  });

  if (resultado.canceled || !resultado.assets?.length) return [];
  return resultado.assets;
}
