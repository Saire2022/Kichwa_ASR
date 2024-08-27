import { View, Text } from 'react-native'
import React from 'react'

export default function Description() {
    return (
        <View 
        style={{
            padding:10,
        }}>
            <Text
            style={{
                fontSize:20,
            }}>
                Kichawa ASR es una App móvil para el reconocimiento automático de voz está diseñada
                para el idioma Kichwa, permitiendo la transcripción precisa y rápida de audio en texto.

            </Text>
        </View>
    )
}