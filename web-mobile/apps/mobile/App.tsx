import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { Card, Headline } from '@acme/ui'

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Headline>Web + Mobile Monorepo</Headline>
        <Text style={styles.subtitle}>Expo (mobile) + Next.js (web)</Text>
        <View style={{ marginTop: 16 }}>
          <Card>
            <Text>Shared UI Card rendered in Mobile</Text>
          </Card>
        </View>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#666' },
})
