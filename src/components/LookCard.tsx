import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { GarmentCategory, LookResult } from "../types";

type Props = {
  look: LookResult;
};

const categoryLabels: Record<GarmentCategory, string> = {
  top: "Blusa",
  bottom: "Cal\u00e7a",
  dress: "Vestido",
  shoes: "Sapato",
  accessory: "Acess\u00f3rio",
};

export function LookCard({ look }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{look.title}</Text>
          <Text style={styles.summary}>{look.summary}</Text>
        </View>
        {look.previewUri ? <Image source={{ uri: look.previewUri }} style={styles.preview} /> : null}
      </View>

      {look.trendComment ? (
        <View style={styles.trendBox}>
          <Text style={styles.trendLabel}>Tendências de moda</Text>
          <Text style={styles.trendText}>{look.trendComment}</Text>
        </View>
      ) : null}

      <View style={styles.pieceList}>
        {look.pieces.map((piece) => (
          <View key={piece.id} style={styles.pieceChip}>
            <Text style={styles.pieceChipText}>{piece.label} / {categoryLabels[piece.category]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.promptBox}>
        <Text style={styles.promptLabel}>Prompt t\u00e9cnico para o provedor</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.promptText}>{look.prompt}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e9ddd0",
    gap: 14,
  },
  header: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  title: {
    color: "#17212b",
    fontSize: 19,
    fontWeight: "800",
  },
  summary: {
    color: "#5f6b76",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 210,
  },
  preview: {
    width: 82,
    height: 102,
    borderRadius: 18,
    backgroundColor: "#ebdfd0",
  },
  pieceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pieceChip: {
    backgroundColor: "#f1e7d9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pieceChipText: {
    color: "#314352",
    fontSize: 13,
    fontWeight: "700",
  },
  trendBox: {
    backgroundColor: "#f6efe7",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  trendLabel: {
    color: "#7b4a35",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  trendText: {
    color: "#30414e",
    fontSize: 13,
    lineHeight: 19,
  },
  promptBox: {
    backgroundColor: "#f6efe7",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  promptLabel: {
    color: "#7b4a35",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  promptText: {
    color: "#30414e",
    fontSize: 13,
    lineHeight: 19,
    minWidth: "100%",
  },
});
