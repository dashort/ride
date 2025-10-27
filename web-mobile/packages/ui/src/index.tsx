import { Text, View } from 'react-native'
import type { PropsWithChildren } from 'react'

export function Headline(props: PropsWithChildren) {
  return (
    <Text style={{ fontSize: 24, fontWeight: '700' }}>{props.children}</Text>
  )
}

export function Card(props: PropsWithChildren) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: 'white',
      }}
    >
      {props.children}
    </View>
  )
}
