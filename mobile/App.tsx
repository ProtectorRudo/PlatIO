import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type PlantState = 'empty' | 'comfortable' | 'soon' | 'water' | 'recovering';

type Pot = {
  id: number;
  plant?: string;
  room?: string;
  state: PlantState;
};

const initialPots: Pot[] = [
  { id: 1, plant: 'Jazmín', room: 'Balcón', state: 'comfortable' },
  { id: 2, plant: 'Margarita', room: 'Cocina', state: 'soon' },
  { id: 3, plant: 'Potus', room: 'Living', state: 'water' },
  { id: 4, state: 'empty' },
  { id: 5, state: 'empty' },
  { id: 6, state: 'empty' },
  { id: 7, state: 'empty' },
  { id: 8, state: 'empty' },
];

const stateCopy: Record<PlantState, { emoji: string; label: string; detail: string }> = {
  empty: { emoji: '＋', label: 'Agregar planta', detail: 'Decinos qué planta hay acá.' },
  comfortable: { emoji: '🌿', label: 'Está cómoda', detail: 'No hace falta hacer nada.' },
  soon: { emoji: '🌤️', label: 'Va a necesitar agua pronto', detail: 'Todavía puede esperar.' },
  water: { emoji: '💧', label: 'Ya está pidiendo agua', detail: 'Conviene regarla hoy.' },
  recovering: { emoji: '✅', label: 'Ya recibió agua', detail: 'Estamos verificando que haya quedado bien.' },
};

export default function App() {
  const [pots] = useState(initialPots);

  const attention = useMemo(
    () => pots.filter((pot) => pot.state === 'water').length,
    [pots]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PlatIO</Text>
            <Text style={styles.subtitle}>Tus plantas, sin adivinar.</Text>
          </View>
          <View style={styles.centralBadge}>
            <Text style={styles.centralDot}>●</Text>
            <Text style={styles.centralText}>Central conectada</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryEmoji}>{attention ? '💧' : '🌱'}</Text>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              {attention
                ? attention === 1
                  ? 'Hay 1 planta que necesita agua'
                  : `Hay ${attention} plantas que necesitan agua`
                : 'Todo está bien'}
            </Text>
            <Text style={styles.summaryText}>
              {attention
                ? 'Te mostramos sólo lo que requiere tu atención.'
                : 'No necesitás regar ninguna ahora.'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mis macetas</Text>

        <View style={styles.grid}>
          {pots.map((pot) => {
            const copy = stateCopy[pot.state];
            const empty = pot.state === 'empty';
            return (
              <TouchableOpacity
                key={pot.id}
                activeOpacity={0.8}
                style={[styles.card, empty && styles.emptyCard]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.potNumber}>Maceta {pot.id}</Text>
                  <Text style={styles.stateEmoji}>{copy.emoji}</Text>
                </View>

                <Text style={[styles.plantName, empty && styles.emptyTitle]}>
                  {empty ? 'Sin configurar' : pot.plant}
                </Text>

                {!empty && pot.room ? <Text style={styles.room}>{pot.room}</Text> : null}

                <View style={styles.stateBlock}>
                  <Text style={styles.stateLabel}>{copy.label}</Text>
                  <Text style={styles.stateDetail}>{copy.detail}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>＋ Agregar o cambiar una planta</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Los porcentajes y lecturas técnicas quedan ocultos. Si alguna vez los necesitás,
          estarán en “Diagnóstico”.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F3' },
  page: { padding: 20, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },
  brand: { fontSize: 34, fontWeight: '800', color: '#183526', letterSpacing: -1.2 },
  subtitle: { marginTop: 2, fontSize: 15, color: '#647269' },
  centralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F3EA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  centralDot: { color: '#2A9D55', fontSize: 10 },
  centralText: { color: '#2C6642', fontSize: 12, fontWeight: '700' },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 26,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryEmoji: { fontSize: 34, marginRight: 14 },
  summaryCopy: { flex: 1 },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: '#183526' },
  summaryText: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#66736C' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#183526', marginBottom: 12 },
  grid: { gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E7ECE7',
  },
  emptyCard: { backgroundColor: '#FAFBF9', borderStyle: 'dashed' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  potNumber: { fontSize: 12, fontWeight: '700', color: '#7A877F', textTransform: 'uppercase' },
  stateEmoji: { fontSize: 25 },
  plantName: { marginTop: 10, fontSize: 23, fontWeight: '800', color: '#183526' },
  emptyTitle: { color: '#728078' },
  room: { marginTop: 2, fontSize: 14, color: '#7B887F' },
  stateBlock: { marginTop: 16 },
  stateLabel: { fontSize: 16, fontWeight: '750', color: '#263E31' },
  stateDetail: { marginTop: 2, fontSize: 14, color: '#748178', lineHeight: 19 },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#1F6B42',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  footnote: {
    marginTop: 14,
    paddingHorizontal: 8,
    textAlign: 'center',
    color: '#89948E',
    fontSize: 12,
    lineHeight: 17,
  },
});
