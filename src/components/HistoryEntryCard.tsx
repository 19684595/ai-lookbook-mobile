import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LookHistoryEntry } from "../types";

type Props = {
  entry: LookHistoryEntry;
  isFavorite: boolean;
  onOpen: (entry: LookHistoryEntry) => void;
  onToggleFavorite: (entry: LookHistoryEntry) => void;
};

function formatDate(value: string) {
  try {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return value;
  }
}

export function HistoryEntryCard({ entry, isFavorite, onOpen, onToggleFavorite }: Props) {
  return (
    <Pressable style={styles.card} onPress={() => onOpen(entry)}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{entry.request.styleBrief || "Sess\u00e3o sem descri\u00e7\u00e3o"}</Text>
          <Pressable style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]} onPress={() => onToggleFavorite(entry)}>
            <Text style={[styles.favoriteButtonText, isFavorite && styles.favoriteButtonTextActive]}>{isFavorite ? "Favorito" : "Favoritar"}</Text>
          </Pressable>
        </View>
        <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
      </View>
      <Text style={styles.meta}>{entry.looks.length} look(s) / {entry.request.garmentCount} pe\u00e7a(s) / provedor {entry.provider}</Text>
      <Text style={styles.caption}>Toque para abrir novamente esta sele\u00e7\u00e3o.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf3",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 8,
  },
  header: {
    gap: 4,
  },
  titleWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    color: "#20303d",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  favoriteButton: {
    backgroundColor: "#f0e4d4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  favoriteButtonActive: {
    backgroundColor: "#cc5f35",
  },
  favoriteButtonText: {
    color: "#314352",
    fontSize: 12,
    fontWeight: "800",
  },
  favoriteButtonTextActive: {
    color: "#fff8ee",
  },
  date: {
    color: "#7b6d60",
    fontSize: 12,
    fontWeight: "600",
  },
  meta: {
    color: "#4f5d6b",
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    color: "#8a4b2f",
    fontSize: 13,
    fontWeight: "700",
  },
});
