import React from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GarmentCategory, GarmentPiece } from "../types";

type Props = {
  garments: GarmentPiece[];
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<GarmentPiece>) => void;
};

const categories: GarmentCategory[] = ["top", "bottom", "dress", "shoes", "accessory"];

const categoryLabels: Record<GarmentCategory, string> = {
  top: "Blusa",
  bottom: "Calça",
  dress: "Vestido",
  shoes: "Sapato",
  accessory: "Acessório",
};

export function GarmentGrid({ garments, onRemove, onChange }: Props) {
  if (garments.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Peças cadastradas</Text>
      <View style={styles.grid}>
        {garments.map((garment) => (
          <View key={garment.id} style={styles.card}>
            <Image source={{ uri: garment.image.uri }} style={styles.image} />
            <TextInput
              value={garment.label}
              onChangeText={(value) => onChange(garment.id, { label: value })}
              style={styles.input}
              placeholder="Nome da peça"
              placeholderTextColor="#847a6f"
            />

            <View style={styles.categoryRow}>
              {categories.map((category) => {
                const active = garment.category === category;
                return (
                  <Pressable
                    key={category}
                    style={[styles.categoryChip, active && styles.activeChip]}
                    onPress={() => onChange(garment.id, { category })}
                  >
                    <Text style={[styles.categoryText, active && styles.activeChipText]}>{categoryLabels[category]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.removeButton} onPress={() => onRemove(garment.id)}>
              <Text style={styles.removeText}>Excluir peça</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  title: {
    color: "#1d2833",
    fontSize: 20,
    fontWeight: "800",
  },
  grid: {
    gap: 14,
  },
  card: {
    backgroundColor: "#fffaf3",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 1.2,
    borderRadius: 16,
    backgroundColor: "#ebdece",
  },
  input: {
    backgroundColor: "#f6ede2",
    borderWidth: 1,
    borderColor: "#e0d1bf",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1e2a35",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#f0e4d5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeChip: {
    backgroundColor: "#274c67",
  },
  categoryText: {
    color: "#314352",
    fontSize: 13,
    fontWeight: "700",
  },
  activeChipText: {
    color: "#fff8ee",
  },
  removeButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  removeText: {
    color: "#a23a2d",
    fontWeight: "700",
  },
});
