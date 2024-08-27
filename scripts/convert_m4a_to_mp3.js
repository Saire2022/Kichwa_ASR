import axios from 'axios';
import { API_CONVERT } from "@env";

// Función para subir el archivo
const uploadFile = async (fileUri) => {
  try {
    const formData = new FormData();
    const fileName = fileUri.split('/').pop();
    
    // Añadir el archivo al formData
    formData.append('file', {
      uri: fileUri,
      type: 'audio/m4a',
      name: fileName,
    });

    // Subir el archivo al servicio de CloudConvert
    const response = await axios.post('https://api.cloudconvert.com/v2/import/upload', formData, {
      headers: {
        'Authorization': `Bearer ${API_CONVERT}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.id; // ID del archivo subido
  } catch (error) {
    console.error('Error al subir el archivo:', error.response ? error.response.data : error.message);
    throw error;
  }
};
const startConversion = async (inputFileId) => {
  try {
    const conversionResponse = await axios.post('https://api.cloudconvert.com/v2/convert', {
      input: inputFileId,
      input_format: 'm4a',
      output_format: 'mp3',
    }, {
      headers: {
        'Authorization': `Bearer ${API_CONVERT}`,
        'Content-Type': 'application/json',
      },
    });

    const { data } = conversionResponse;
    return data; // Detalles de la conversión, incluye URL del MP3 convertido
  } catch (error) {
    console.error('Error durante la conversión:', error.response ? error.response.data : error.message);
    throw error;
  }
};
export const getMp3File = async (m4aUri) => {
  try {
    // Subir el archivo
    const inputFileId = await uploadFile(m4aUri);

    // Iniciar la conversión
    const conversionResult = await startConversion(inputFileId);

    console.log('Archivo MP3:', conversionResult);
    return conversionResult; // Incluye URL del archivo MP3 convertido
  } catch (error) {
    console.error('Error al procesar el archivo MP3:', error);
    throw error;
  }
};
