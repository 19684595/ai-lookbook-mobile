import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ImageAsset } from "../types";

type Props = {
  title: string;
  description: string;
  image: ImageAsset | null;
  accentColor: string;
  onChooseLibrary: () => void;
  onChooseCamera: () => void;
  onClear?: () => void;
  compact?: boolean;
};

export function ImageSelectorCard({ title, description, image, accentColor, onChooseLibrary, onChooseCamera, onClear, compact = false }: Props) {
  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>

      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} />
      ) : (
        <View style={[styles.placeholder, compact && styles.compactPlaceholder]}>
          <Text style={styles.placeholderText}>Nenhuma imagem selecionada</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onChooseCamera}>
          <Text style={styles.buttonText}>Fotografar</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onChooseLibrary}>
          <Text style={styles.secondaryButtonText}>Escolher da galeria</Text>
        </Pressable>
        {image && onClear ? (
          <Pressable style={styles.linkButton} onPress={onClear}>
            <Text style={styles.linkText}>Trocar imagem</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 12,
  },
  compactCard: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    color: "#1d2833",
    fontSize: 20,
    fontWeight: "800",
  },
  description: {
    color: "#566473",
    fontSize: 14,
    lineHeight: 20,
  },
  preview: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 20,
    backgroundColor: "#eadfce",
  },
  placeholder: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#c6b59d",
    backgroundColor: "#f6f0e6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  compactPlaceholder: {
    height: 110,
  },
  placeholderText: {
    color: "#7a6c5a",
    fontSize: 14,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  buttonText: {
    color: "#fff8f0",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f0e4d4",
  },
  secondaryButtonText: {
    color: "#2d3742",
    fontWeight: "700",
    fontSize: 14,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  linkText: {
    color: "#7d3f28",
    fontWeight: "700",
    fontSize: 14,
  },
});
