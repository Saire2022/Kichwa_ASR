import { Audio } from "expo-av";

// Variable global para manejar el sonido
let currentSound = null;
let isPlaying = false;
// Función para reproducir audio
export const playAudio = async (
    audioUri,
    sound,
    setSound,
    isPlaying,
    setIsPlaying,
    setAudioDuration,
    setCurrentPosition
  ) => {
    try {
      if (sound && isPlaying) {
        // Pausar el sonido si ya está en reproducción
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound && !isPlaying) {
        // Reanudar el sonido si está en pausa
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        // Si no hay un sonido actual, crear uno nuevo y reproducirlo
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
  
        setAudioDuration(status.durationMillis);
        setSound(newSound);
        setIsPlaying(true);
  
        // Manejar el estado de reproducción
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setCurrentPosition(status.positionMillis);
  
            if (status.didJustFinish) {
              setIsPlaying(false);
              setSound(null);
            }
          } else if (status.error) {
            console.error("Error de reproducción:", status.error);
          }
        });
      }
    } catch (error) {
      console.error("Error al manejar la reproducción del audio:", error);
    }
  };