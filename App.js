import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Button,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { HfInference } from "@huggingface/inference";
import { API_TOKEN } from "@env";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av"; // Importa la API de audio
import React, { useState, useRef, useEffect } from "react";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { playAudio } from "./scripts/audioUtils"; // Ajusta la ruta según tu estructura de carpetas
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AudioTranscoder from "react-native-audio-transcoder";
import { Platform } from "react-native";

global.Buffer = Buffer;

/* const hf = new HfInference(API_TOKEN);
console.log("This is the token:", API_TOKEN);
 */
const hf = new HfInference(API_TOKEN);
console.log("This is the token:", API_TOKEN);

const convertAudioToMp3 = async (m4aUri) => {
  const mp3Uri = m4aUri.replace(".m4a", ".mp3");

  try {
    await AudioTranscoder.transcode(m4aUri, mp3Uri, "audio/mpeg");
    console.log("Audio convertido a MP3:", mp3Uri);
    return mp3Uri;
  } catch (error) {
    console.error("Error al convertir el audio:", error);
    throw error;
  }
};

// Función para obtener el tipo MIME del archivo
const getFileType = (fileUri) => {
  if (typeof fileUri !== "string") {
    console.error("fileUri no es una cadena:", fileUri);
    return "audio/*"; // Tipo MIME genérico si hay un error
  }

  const extension = fileUri.split(".").pop().toLowerCase();
  switch (extension) {
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    default:
      return "audio/*";
  }
};

// Función para realizar la consulta al modelo
const query = async (audioUri) => {
  try {
    const formData = new FormData();
    const fileName = audioUri.split("/").pop(); // Obtener el nombre del archivo real
    formData.append("file", {
      uri: audioUri,
      type: getFileType(audioUri),
      name: fileName, // Usar el nombre real del archivo
    });

    const response = await axios({
      url: `https://api-inference.huggingface.co/models/ctaguchi/killkan_asr`,
      method: "POST",
      headers: {
        Authorization: `Bearer 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`,
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
      },
      data: formData,
    });

    console.log("Respuesta del servidor:", response.data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 503) {
      Alert.alert("Error", "Inténtalo más tarde");
    } else {
      console.error("Error making the request:", error);
    }
    throw error;
  }
};

export default function App() {
  // Subir Audio
  const [audio, setAudio] = useState(null);
  const [textData, setTextData] = useState("");
  const [loading, setLoading] = useState(false);
  // Grabar Audio
  const [recordingStatus, setRecordingStatus] = useState(""); // Inicializa el estado
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState();
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Reproducir Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);

  //------------------------------------------------------------------
  //---------------Enviar Audio al Modelo-----------------------------
  //------------------------------------------------------------------

  const handleSendRecording = async () => {
    setLoading(true);
    try {
      const data = { inputs: recordingUri }; // Make sure recordingUri is defined
      console.log("Cargando modelo ...");
      const response = await query(recordingUri);
      console.log("Respuesta del servidor:", response);

      // Asegúrate de extraer el texto correctamente
      const textResponse = response.text || "";
      setTextData(textResponse);

      setLoading(false);
    } catch (error) {
      console.error("Error --->:", error);
      setLoading(false);
    }
  };

  //------------------------------------------------------------------
  //---------------Funciones para subir Audios------------------------
  //------------------------------------------------------------------
  const handleButtonUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*", // Solo archivos de audio
      });

      console.log("Resultado del selector de documentos:", result);

      if (
        result.canceled === false &&
        result.assets &&
        result.assets.length > 0
      ) {
        const audioUri = result.assets[0].uri;
        setRecordingUri(audioUri); // Guardar el URI seleccionado
        console.log("Archivo cargado:", audioUri);
      } else {
        console.log("Selección de archivo cancelada");
      }
    } catch (error) {
      console.error("Error al seleccionar el archivo:", error);
    }
  };

  //-------------------------------------------------------------------
  // -------------Funciones para grabar audio--------------------------
  //-------------------------------------------------------------------
  const handleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
    setIsRecording(!isRecording);
  };

  async function startRecording() {
    try {
      if (permissionResponse.status !== "granted") {
        console.log("Requesting permission...");
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log("Recording started");

      // Iniciar la actualización del tiempo de grabación
      recordingInterval = setInterval(async () => {
        const status = await recording.getStatusAsync();
        setRecordingDuration(status.durationMillis);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    try {
      console.log("Stopping recording..");

      if (recording) {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        const uri = recording.getURI();
        setRecordingUri(uri);
        console.log("Recording stopped and stored at", uri);
      }

      clearInterval(recordingInterval);
      setRecording(null);
      setRecordingDuration(0);
      setRecordingStatus("Grabación finalizada");
    } catch (error) {
      console.error("Failed to stop recording", error);
    }
  }

  /* ------------------------------------------------------- */
  /*-------------------------Play audio--------------------- */
  /* ------------------------------------------------------- */

  const handlePlayRecording = () => {
    if (recordingUri) {
      playAudio(
        recordingUri,
        sound,
        setSound,
        isPlaying,
        setIsPlaying,
        setAudioDuration,
        setCurrentPosition
      );
    } else {
      console.log("No hay grabación para reproducir.");
    }
  };

  const handleDeleteRecording = async () => {
    try {
      if (sound) {
        await sound.unloadAsync(); // Detener y descargar el sonido si está en reproducción
        setSound(null);
      }

      setRecordingUri(null); // Limpiar la URI del audio
      setIsPlaying(false);
      setCurrentPosition(0);
      setAudioDuration(0);

      console.log("Grabación eliminada");
    } catch (error) {
      console.error("Error al eliminar la grabación:", error);
    }
  };

  return (
    <SafeAreaView style={{ marginTop: 50, alignItems: "center" }}>
      <StatusBar style="auto" />
      <View style={{ alignItems: "center" }}>
        <Text
          style={{
            fontSize: 30,
            color: "blue",
            fontWeight: "bold",
          }}
        >
          Kichwa ASR
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 10,
          width: "80%",
        }}
      >
        <Pressable
          style={({ pressed }) => [
            {
              borderColor: pressed ? "#02CFE6" : "#023FE6",
              backgroundColor: pressed ? "" : "#023FE6",
              borderRadius: 15,
              alignContent: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 10,
            },
          ]}
          onPress={handleButtonUpload} // Llama a la función de cargar audio
        >
          <Feather
            name="paperclip"
            size={24}
            color="black"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "white" }}> Subir audio</Text>
        </Pressable>

        {/* Record Audio */}
        <Pressable
          style={({ pressed }) => [
            {
              borderColor: pressed ? "#02CFE6" : "#023FE6",
              backgroundColor: pressed ? "#02CFE6" : "#023FE6",
              borderRadius: 15,
              alignContent: "center",
              padding: 10,
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 10,
            },
          ]}
          onPress={handleRecording}
        >
          <FontAwesome5
            name={isRecording ? "stop" : "microphone"}
            size={24}
            color={isRecording ? "red" : "black"}
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "white", paddingRight: 8 }}>
            {isRecording ? "Detener" : "Grabar"}
          </Text>
          <Text>
            {Math.floor(recordingDuration / 1000 / 60)}:
            {Math.floor((recordingDuration / 1000) % 60)
              .toString()
              .padStart(2, "0")}
          </Text>
        </Pressable>
      </View>

      {/* Play Audio */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 10,
          width: "80%",
          backgroundColor: "#BFE1E3",
          borderRadius: 15,
        }}
      >
        {recordingUri && (
          <>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  {
                    borderColor: pressed ? "#02CFE6" : "#023FE6",
                    backgroundColor: pressed ? "#02CFE6" : "#023FE6",
                    borderRadius: 15,
                    alignContent: "center",
                    padding: 10,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  },
                ]}
                onPress={handlePlayRecording}
              >
                <FontAwesome5
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="black"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: "white" }}>
                  {Math.floor(currentPosition / 1000 / 60)}:
                  {Math.floor((currentPosition / 1000) % 60)
                    .toString()
                    .padStart(2, "0")}{" "}
                  / {Math.floor(audioDuration / 1000 / 60)}:
                  {Math.floor((audioDuration / 1000) % 60)
                    .toString()
                    .padStart(2, "0")}
                </Text>
              </Pressable>

              {/* Trash Icon as a Button */}
              <TouchableOpacity
                onPress={handleDeleteRecording} // Function to delete the recording
                style={{ marginTop: 5, marginLeft: 10 }}
              >
                <FontAwesome5 name="trash" size={24} color="#FC304B" />
              </TouchableOpacity>
            </View>
            {/* Send button*/}
            <View>
              <TouchableOpacity
                onPress={handleSendRecording}
                style={{ marginTop: 10, marginRight: 10 }}
              >
                <FontAwesome name="send" size={30} color="#023FE6" />
                <Text>Enviar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00ff00" />
      ) : (
        <>
        <View 
        style={{
          margin:20
        }}>
              <TextInput
                style={styles.OutputContainer}
                placeholder="Aquí va la respuesta en Kichwa"
                value={textData}
                multiline={true}
                numberOfLines={10}
                onChangeText={setTextData}
              />
       </View>
        </>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : styles.buttonDefault,
        ]}
        //onPress={handleButtonUpload} // Llama a la función para enviar el audio
      >
        <FontAwesome5 name="download" size={24} color="black" />
        <Text style={{ color: "white" }}> Descargar</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ccontainer: {
    //flex: 1,
    padding: 10,
  },
  scrollContainer: {
    //flexGrow: 1,
    padding: 25,
  },
  OutputContainer: {
    //flex: 1,
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#f9f9f9",
    textAlignVertical: "top",
    fontSize: 16,
    color: "#333",
  },
  button: {
    marginTop: 15,
    borderRadius: 15,
    alignContent: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  buttonPressed: {
    borderColor: "#48c9b0",
    backgroundColor: "#48c9b0",
  },
  buttonDefault: {
    borderColor: "#3498db",
    backgroundColor: "#3498db",
  },
});
