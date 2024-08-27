import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const CopyButton = ({ textToCopy }) => {
  const handleCopy = () => {
    Clipboard.setString(textToCopy);
  };

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : styles.buttonDefault,
        ]}
        onPress={handleCopy}
      >
        <FontAwesome5 name="copy" size={24} color="black" />
        <Text style={{ color: "white" }}> Copiar</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default CopyButton;
