import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { checkStylingBackend, createStylingService } from "./src/services/stylingService";
import { localCatalogService } from "./src/services/localCatalogService";
import {
  AiProvider,
  AppCatalog,
  GarmentCategory,
  GarmentPiece,
  ImageAsset,
  LookGenerationInput,
  LookResult,
  SavedLook,
  StoredGarment,
  StoredModel,
  SuggestedEnvironment,
} from "./src/types";

type Screen =
  | "home"
  | "models"
  | "wardrobe"
  | "generator"
  | "manual-looks"
  | "suggested-looks"
  | "history"
  | "credits";

const promptSuggestions = [
  "Look elegante para jantar",
  "Visual urbano para passeio no fim da tarde",
  "Produção fashion para evento noturno",
  "Look casual chic para shopping",
];

const environmentSuggestions: SuggestedEnvironment[] = [
  "Passarela",
  "Balada",
  "Rua",
  "Shopping",
  "Praia",
  "Escritório",
  "Café",
  "Restaurante",
  "Parque",
  "Academia",
  "Estúdio fotográfico",
  "Fundo neutro",
  "Cidade à noite",
  "Hotel luxuoso",
  "Evento ao ar livre",
  "Festa de casamento",
];
const aiProviderOptions: Array<{ id: AiProvider; label: string; description: string }> = [
  {
    id: "piapi",
    label: "PiAPI",
    description: "Usa a PiAPI configurada no backend.",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Usa a chave OpenAI informada neste aparelho.",
  },
];
const categoryLabels: Record<GarmentCategory, string> = {
  top: "Blusa",
  bottom: "Calça",
  dress: "Vestido",
  shoes: "Sapato",
  accessory: "Acessório",
};

const renderableCategories = new Set<GarmentCategory>(["top", "bottom", "dress"]);
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_COMPRESSION = 0.82;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function describeCreditCost(rendered: boolean) {
  return rendered ? 3 : 1;
}

async function requestMediaPermission() {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
}

async function requestCameraPermission() {
  const result = await ImagePicker.requestCameraPermissionsAsync();
  return result.granted;
}

async function normalizeAsset(asset: ImagePicker.ImagePickerAsset): Promise<ImageAsset> {
  try {
    const width = asset.width ?? 0;
    const height = asset.height ?? 0;
    const actions: ImageManipulator.Action[] = [];
    const largestDimension = Math.max(width, height);

    if (largestDimension > MAX_IMAGE_DIMENSION) {
      actions.push(width >= height ? { resize: { width: MAX_IMAGE_DIMENSION } } : { resize: { height: MAX_IMAGE_DIMENSION } });
    }

    const image = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress: IMAGE_COMPRESSION,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });

    return {
      uri: image.uri,
      width: image.width,
      height: image.height,
      fileName: asset.fileName?.replace(/\.[^.]+$/, ".jpg") ?? `image-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      base64: image.base64,
    };
  } catch {
    let base64: string | undefined;
    try {
      base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      base64 = undefined;
    }

    return {
      uri: asset.uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
      base64,
    };
  }
}

async function normalizeAssets(assets: ImagePicker.ImagePickerAsset[]) {
  return Promise.all(assets.map((asset) => normalizeAsset(asset)));
}

function buildVirtualPieces(model: StoredModel, prompt: string): GarmentPiece[] {
  return [
    { id: makeId("virtual"), label: `Peça sugerida 1`, category: "top", image: model.image },
    { id: makeId("virtual"), label: `Peça sugerida 2`, category: "bottom", image: model.image },
    { id: makeId("virtual"), label: prompt.includes("sapato") ? "Sapato sugerido" : "Acessório sugerido", category: prompt.includes("sapato") ? "shoes" : "accessory", image: model.image },
  ];
}

function isRenderableGarment(piece: GarmentPiece) {
  return renderableCategories.has(piece.category);
}

function hasRenderableGarment(pieces: GarmentPiece[]) {
  return pieces.some(isRenderableGarment);
}

function buildSavedLook(params: {
  name: string;
  mode: "manual" | "suggested";
  result: LookResult;
  model?: StoredModel;
  renderedImage: boolean;
  environment?: SuggestedEnvironment;
}): SavedLook {
  return {
    id: makeId("saved-look"),
    name: params.name,
    mode: params.mode,
    createdAt: new Date().toISOString(),
    modelId: params.model?.id,
    modelName: params.model?.name ?? "Modelo",
    summary: params.result.summary,
    trendComment: params.result.trendComment,
    prompt: params.result.prompt,
    previewUri: params.result.previewUri,
    renderedImage: params.renderedImage,
    environment: params.environment,
    pieces: params.result.pieces.map((piece) => ({
      id: piece.id,
      label: piece.label,
      category: piece.category,
    })),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return (
    <View style={styles.hero}>
      {onBack ? (
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      ) : null}
      <Text style={styles.eyebrow}>LookBook IA</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function MenuButton({ title, caption, onPress }: { title: string; caption: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuButton} onPress={onPress}>
      <Text style={styles.menuButtonTitle}>{title}</Text>
      <Text style={styles.menuButtonCaption}>{caption}</Text>
    </Pressable>
  );
}

function getPreviousScreen(screen: Screen): Screen | null {
  switch (screen) {
    case "models":
    case "wardrobe":
    case "generator":
    case "history":
    case "credits":
      return "home";
    case "manual-looks":
    case "suggested-looks":
      return "generator";
    case "home":
    default:
      return null;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [catalog, setCatalog] = useState<AppCatalog | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [apiUrlDraft, setApiUrlDraft] = useState("");
  const [aiProviderDraft, setAiProviderDraft] = useState<AiProvider>("piapi");
  const [openAIKeyDraft, setOpenAIKeyDraft] = useState("");
  const [isAiSettingsExpanded, setIsAiSettingsExpanded] = useState(false);

  const [selectedManualModelId, setSelectedManualModelId] = useState<string | null>(null);
  const [selectedManualGarmentIds, setSelectedManualGarmentIds] = useState<string[]>([]);
  const [manualPreview, setManualPreview] = useState<LookResult | null>(null);
  const [manualLookName, setManualLookName] = useState("");

  const [selectedSuggestedPrompt, setSelectedSuggestedPrompt] = useState("");
  const [customSuggestedPrompt, setCustomSuggestedPrompt] = useState("");
  const [selectedSuggestedModelId, setSelectedSuggestedModelId] = useState<string | null>(null);
  const [useSavedPieces, setUseSavedPieces] = useState(true);
  const [renderSuggestedImage, setRenderSuggestedImage] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<SuggestedEnvironment>("Passarela");
  const [customEnvironment, setCustomEnvironment] = useState("");
  const [suggestedPreview, setSuggestedPreview] = useState<LookResult | null>(null);
  const [suggestedPreviewEnvironment, setSuggestedPreviewEnvironment] = useState("");
  const [suggestedLookName, setSuggestedLookName] = useState("");

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    setApiUrlDraft(catalog?.settings.stylingApiUrl || catalog?.settings.embeddedApiUrl || "");
    setAiProviderDraft(catalog?.settings.aiProvider === "openai" ? "openai" : "piapi");
    setOpenAIKeyDraft(catalog?.settings.openAIApiKey || "");
  }, [
    catalog?.settings.aiProvider,
    catalog?.settings.embeddedApiUrl,
    catalog?.settings.openAIApiKey,
    catalog?.settings.stylingApiUrl,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const previousScreen = getPreviousScreen(screen);
      if (!previousScreen) {
        return false;
      }

      setScreen(previousScreen);
      return true;
    });

    return () => subscription.remove();
  }, [screen]);

  async function loadCatalog() {
    const nextCatalog = await localCatalogService.loadCatalog();
    setCatalog(nextCatalog);
  }

  const models = catalog?.models ?? [];
  const garments = catalog?.garments ?? [];
  const savedLooks = catalog?.savedLooks ?? [];
  const credits = catalog?.credits;
  const embeddedApiUrl = catalog?.settings.embeddedApiUrl ?? "";
  const buildVariant = catalog?.settings.buildVariant ?? "";
  const effectiveApiUrl = (catalog?.settings.stylingApiUrl || catalog?.settings.embeddedApiUrl || "").trim();
  const selectedAiProvider: AiProvider = catalog?.settings.aiProvider === "openai" ? "openai" : "piapi";
  const openAIApiKey = catalog?.settings.openAIApiKey?.trim() ?? "";
  const stylingService = useMemo(
    () => createStylingService({ baseUrl: effectiveApiUrl, aiProvider: selectedAiProvider, openAIApiKey }),
    [effectiveApiUrl, openAIApiKey, selectedAiProvider],
  );
  const isRemoteAiEnabled = Boolean(effectiveApiUrl);
  const selectedAiProviderLabel = selectedAiProvider === "openai" ? "OpenAI" : "PiAPI";

  useEffect(() => {
    if (models.length === 0) {
      setSelectedManualModelId(null);
      setSelectedSuggestedModelId(null);
      return;
    }

    const firstModelId = models[0].id;
    const hasModel = (id: string | null) => Boolean(id && models.some((model) => model.id === id));

    setSelectedManualModelId((current) => (hasModel(current) ? current : firstModelId));
    setSelectedSuggestedModelId((current) => (hasModel(current) ? current : firstModelId));
  }, [models]);

  const selectedManualModel = useMemo(
    () => models.find((item) => item.id === selectedManualModelId) ?? null,
    [models, selectedManualModelId],
  );
  const selectedSuggestedModel = useMemo(
    () => models.find((item) => item.id === selectedSuggestedModelId) ?? null,
    [models, selectedSuggestedModelId],
  );
  const selectedManualGarments = garments.filter((item) => selectedManualGarmentIds.includes(item.id));
  const renderableSavedGarments = garments.filter(isRenderableGarment);
  const canRenderSuggestedImage = useSavedPieces && renderableSavedGarments.length > 0;
  const effectiveRenderSuggestedImage = renderSuggestedImage && canRenderSuggestedImage;

  async function chooseFromLibrary(multiple: boolean) {
    const granted = await requestMediaPermission();
    if (!granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para carregar imagens.");
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: IMAGE_COMPRESSION,
      allowsEditing: false,
      allowsMultipleSelection: multiple,
      selectionLimit: multiple ? 0 : 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return [];
    }

    return normalizeAssets(result.assets);
  }

  async function takeSinglePhoto() {
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar fotos.");
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: IMAGE_COMPRESSION,
      cameraType: ImagePicker.CameraType.back,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return normalizeAsset(result.assets[0]);
  }

  async function handleAddModelsFromLibrary() {
    const images = await chooseFromLibrary(true);
    if (images.length === 0) {
      return;
    }

    setIsBusy(true);
    try {
      const next = await localCatalogService.addModels(images);
      setCatalog((current) => (current ? { ...current, models: next } : current));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddModelFromCamera() {
    const image = await takeSinglePhoto();
    if (!image) {
      return;
    }

    setIsBusy(true);
    try {
      const next = await localCatalogService.addModels([image]);
      setCatalog((current) => (current ? { ...current, models: next } : current));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddGarmentsFromLibrary() {
    const images = await chooseFromLibrary(true);
    if (images.length === 0) {
      return;
    }

    setIsBusy(true);
    try {
      const next = await localCatalogService.addGarments(images);
      setCatalog((current) => (current ? { ...current, garments: next } : current));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddGarmentFromCamera() {
    const image = await takeSinglePhoto();
    if (!image) {
      return;
    }

    setIsBusy(true);
    try {
      const next = await localCatalogService.addGarments([image]);
      setCatalog((current) => (current ? { ...current, garments: next } : current));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRenameModel(id: string, name: string) {
    const next = await localCatalogService.renameModel(id, name);
    setCatalog((current) => (current ? { ...current, models: next } : current));
  }

  async function handleRenameGarment(item: StoredGarment) {
    const next = await localCatalogService.updateGarment(item.id, item);
    setCatalog((current) => (current ? { ...current, garments: next } : current));
  }

  async function handleRemoveModel(id: string) {
    const next = await localCatalogService.removeModel(id);
    setCatalog((current) => (current ? { ...current, models: next } : current));
    if (selectedManualModelId === id) {
      setSelectedManualModelId(null);
    }
    if (selectedSuggestedModelId === id) {
      setSelectedSuggestedModelId(null);
    }
  }

  async function handleRemoveGarment(id: string) {
    const next = await localCatalogService.removeGarment(id);
    setCatalog((current) => (current ? { ...current, garments: next } : current));
    setSelectedManualGarmentIds((current) => current.filter((item) => item !== id));
  }

  async function consumeCredits(amount: number, description: string) {
    const next = await localCatalogService.consumeCredits(amount, description);
    setCatalog((current) => (current ? { ...current, credits: next } : current));
  }

  async function topUpCredits(amount: number) {
    const next = await localCatalogService.addCredits(amount, `Recarga manual de ${amount} créditos`);
    setCatalog((current) => (current ? { ...current, credits: next } : current));
  }

  async function saveAiSettings() {
    const nextProvider = aiProviderDraft;
    if (nextProvider === "openai" && !openAIKeyDraft.trim()) {
      Alert.alert("Chave OpenAI necessária", "Informe uma chave OpenAI ou selecione PiAPI como provedor.");
      return;
    }

    const nextSettings = await localCatalogService.updateSettings({
      stylingApiUrl: apiUrlDraft.trim() || catalog?.settings.embeddedApiUrl || "",
      aiProvider: nextProvider,
      openAIApiKey: openAIKeyDraft.trim(),
    });
    setCatalog((current) => (current ? { ...current, settings: nextSettings } : current));
    Alert.alert(
      "Conexão atualizada",
      nextSettings.aiProvider === "openai"
        ? "O app usará OpenAI pelo backend quando gerar looks."
        : nextSettings.stylingApiUrl
          ? "O app usará PiAPI pelo backend quando gerar looks reais."
          : "Sem URL configurada, o app voltou para o modo de demonstração local.",
    );
  }

  async function testApiConnection() {
    const url = apiUrlDraft.trim();
    if (!url) {
      Alert.alert("Informe a URL", "Digite a URL do backend antes de testar a conexão.");
      return;
    }

    if (aiProviderDraft === "openai" && !openAIKeyDraft.trim()) {
      Alert.alert("Chave OpenAI necessária", "Informe uma chave OpenAI ou selecione PiAPI para testar a conexão.");
      return;
    }

    try {
      setIsBusy(true);
      const health = await checkStylingBackend(url, {
        aiProvider: aiProviderDraft,
        openAIApiKey: openAIKeyDraft,
      });
      Alert.alert(
        "Backend conectado",
        `Status: ${health.status}\nProvider: ${health.provider ?? "desconhecido"}\nOpenAI: ${health.openAIConfigured ? "ok" : "não"}\nPiAPI: ${health.piapiConfigured ? "ok" : "não"}\nCloudinary: ${health.cloudinaryConfigured ? "ok" : "não"}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível testar a conexão.";
      Alert.alert("Falha na conexão", message);
    } finally {
      setIsBusy(false);
    }
  }

  async function generateManualLook() {
    if (!selectedManualModel) {
      Alert.alert("Escolha uma modelo", "Selecione uma modelo antes de gerar o look manual.");
      return;
    }

    if (selectedManualGarments.length === 0) {
      Alert.alert("Escolha as peças", "Selecione ao menos uma peça do seu guarda-roupa.");
      return;
    }

    if (!hasRenderableGarment(selectedManualGarments)) {
      Alert.alert(
        "Pe\u00e7a incompat\u00edvel com renderiza\u00e7\u00e3o",
        "Para gerar imagem com a IA atual, selecione ao menos uma pe\u00e7a marcada como Blusa, Cal\u00e7a ou Vestido.",
      );
      return;
    }

    try {
      setIsBusy(true);
      const input: LookGenerationInput = {
        modelImage: selectedManualModel.image,
        garments: selectedManualGarments,
        styleBrief: "Look manual montado pelo usuário",
        maxLooks: 1,
        renderImage: true,
      };
      const [result] = await stylingService.generateLooks(input);
      if (!result.previewUri) {
        throw new Error("A IA retornou a sugest\u00e3o, mas n\u00e3o devolveu uma imagem renderizada.");
      }
      setManualPreview({
        ...result,
        title: "Look manual renderizado",
      });
      await consumeCredits(1, "Renderização de look manual");
      setManualLookName(`Look manual ${savedLooks.length + 1}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível gerar o look manual agora.";
      Alert.alert("Falha na geração", message);
    } finally {
      setIsBusy(false);
    }
  }

  async function saveManualLook() {
    if (!manualPreview || !selectedManualModel) {
      return;
    }

    const look = buildSavedLook({
      name: manualLookName.trim() || `Look manual ${savedLooks.length + 1}`,
      mode: "manual",
      result: manualPreview,
      model: selectedManualModel,
      renderedImage: true,
    });
    const next = await localCatalogService.saveLook(look);
    setCatalog((current) => (current ? { ...current, savedLooks: next } : current));
    Alert.alert("Look salvo", "Seu look manual foi salvo no histórico.");
  }

  async function generateSuggestedLook() {
    if (!selectedSuggestedModel) {
      Alert.alert("Escolha uma modelo", "Selecione a modelo que vai inspirar o look sugerido.");
      return;
    }

    const prompt = customSuggestedPrompt.trim() || selectedSuggestedPrompt;
    if (!prompt) {
      Alert.alert("Defina o prompt", "Escolha um prompt sugerido ou escreva a sua própria direção criativa.");
      return;
    }

    const shouldUseSavedPieces = useSavedPieces && garments.length > 0;
    const shouldRenderImage = renderSuggestedImage && shouldUseSavedPieces && renderableSavedGarments.length > 0;
    const creditCost = describeCreditCost(shouldRenderImage);
    const sourcePieces = shouldUseSavedPieces
      ? shouldRenderImage
        ? renderableSavedGarments
        : garments
      : buildVirtualPieces(selectedSuggestedModel, prompt);
    const selectedPieces = shouldRenderImage ? sourcePieces.slice(0, Math.min(sourcePieces.length, 4)) : sourcePieces;
    const backgroundEnvironment = customEnvironment.trim() || selectedEnvironment;
    const styleBrief = shouldRenderImage
      ? `${prompt}. Use obrigatoriamente "${backgroundEnvironment}" como fundo/cenário principal da foto renderizada. Substitua ou redesenhe o fundo original se necessário, mantendo a modelo natural e o look em destaque.`
      : `${prompt}. Retorne uma sugestão textual clara, sofisticada e objetiva.`;

    try {
      setIsBusy(true);

      const [result] = await stylingService.generateLooks({
        modelImage: selectedSuggestedModel.image,
        garments: selectedPieces,
        styleBrief,
        maxLooks: 1,
        renderImage: shouldRenderImage,
      });

      if (shouldRenderImage && !result.previewUri) {
        throw new Error("A IA retornou a sugest\u00e3o, mas n\u00e3o devolveu uma imagem renderizada.");
      }

      setSuggestedPreview({
        ...result,
        title: shouldRenderImage ? "Look sugerido renderizado" : "Look sugerido em texto",
        previewUri: shouldRenderImage ? result.previewUri : undefined,
        summary: shouldUseSavedPieces
          ? result.summary
          : `Sugestão criada a partir do prompt "${prompt}" com peças livres indicadas pela IA para o perfil da modelo.`,
      });
      setSuggestedPreviewEnvironment(shouldRenderImage ? backgroundEnvironment : "");
      await consumeCredits(creditCost, shouldRenderImage ? "Look sugerido com renderização" : "Look sugerido em texto");
      setSuggestedLookName(`Look sugerido ${savedLooks.length + 1}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível gerar o look sugerido.";
      Alert.alert("Falha na geração", message);
    } finally {
      setIsBusy(false);
    }
  }

  async function saveSuggestedLook() {
    if (!suggestedPreview || !selectedSuggestedModel) {
      return;
    }

    const renderedImage = Boolean(suggestedPreview.previewUri);
    const look = buildSavedLook({
      name: suggestedLookName.trim() || `Look sugerido ${savedLooks.length + 1}`,
      mode: "suggested",
      result: suggestedPreview,
      model: selectedSuggestedModel,
      renderedImage,
      environment: renderedImage ? suggestedPreviewEnvironment || customEnvironment.trim() || selectedEnvironment : undefined,
    });
    const next = await localCatalogService.saveLook(look);
    setCatalog((current) => (current ? { ...current, savedLooks: next } : current));
    Alert.alert("Look salvo", "Seu look sugerido foi salvo no histórico.");
  }

  function toggleManualGarment(id: string) {
    setSelectedManualGarmentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (!catalog) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="dark" />
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#1e3d59" />
          <Text style={styles.loadingText}>Preparando seu catálogo local...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {screen === "home" ? (
          <>
            <ScreenHeader
              title="Navegue pelo seu closet inteligente"
              subtitle="Organize modelos, cadastre peças, gere looks e acompanhe seus créditos sem precisar de login."
            />

            <View style={styles.creditBanner}>
              <Text style={styles.creditBannerLabel}>Créditos disponíveis</Text>
              <Text style={styles.creditBannerValue}>{credits?.balance ?? 0}</Text>
            </View>

            <View style={styles.panel}>
              <Pressable style={styles.collapsibleHeader} onPress={() => setIsAiSettingsExpanded((current) => !current)}>
                <View style={styles.collapsibleCopy}>
                  <Text style={styles.sectionTitle}>Conexão com IA</Text>
                  <Text style={styles.rowCaption}>
                    {isRemoteAiEnabled
                      ? `Backend remoto configurado. Provedor atual: ${selectedAiProviderLabel}.`
                      : "Modo demonstração local. Toque para configurar IA."}
                  </Text>
                </View>
                <Text style={styles.collapseIndicator}>{isAiSettingsExpanded ? "Recolher" : "Configurar"}</Text>
              </Pressable>

              {isAiSettingsExpanded ? (
                <>
                  {buildVariant ? <Text style={styles.rowCaption}>Build instalada: {buildVariant}</Text> : null}
                  {embeddedApiUrl ? <Text style={styles.rowCaption}>API embutida: {embeddedApiUrl}</Text> : null}
                  <TextInput
                    value={apiUrlDraft}
                    onChangeText={setApiUrlDraft}
                    placeholder="URL do backend. Ex.: https://ai-lookbook-mobile.onrender.com"
                    placeholderTextColor="#8f8579"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  <Text style={styles.label}>Provedor de IA</Text>
                  <View style={styles.providerGrid}>
                    {aiProviderOptions.map((option) => (
                      <Pressable
                        key={option.id}
                        style={[styles.providerOption, aiProviderDraft === option.id && styles.providerOptionActive]}
                        onPress={() => setAiProviderDraft(option.id)}
                      >
                        <Text style={[styles.providerTitle, aiProviderDraft === option.id && styles.providerTitleActive]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.providerDescription, aiProviderDraft === option.id && styles.providerDescriptionActive]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {aiProviderDraft === "openai" ? (
                    <TextInput
                      value={openAIKeyDraft}
                      onChangeText={setOpenAIKeyDraft}
                      placeholder="Chave OpenAI"
                      placeholderTextColor="#8f8579"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      style={styles.input}
                    />
                  ) : null}
                  <Text style={styles.rowCaption}>
                    {aiProviderDraft === "openai"
                      ? "OpenAI usa a chave salva neste aparelho e pode gerar texto ou imagem conforme a opção escolhida."
                      : "PiAPI usa as chaves protegidas no backend e é o provedor padrão para vestir a modelo com as peças."}
                  </Text>
                  <View style={styles.actionRow}>
                    <Pressable style={styles.primaryButton} onPress={saveAiSettings}>
                      <Text style={styles.primaryButtonText}>Salvar conexão</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryActionButton} onPress={testApiConnection}>
                      <Text style={styles.secondaryActionButtonText}>Testar conexão</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.menuGrid}>
              <MenuButton title="Modelos" caption="Cadastre e organize as fotos das modelos." onPress={() => setScreen("models")} />
              <MenuButton title="Meu Guarda-Roupas" caption="Salve suas peças e monte seu acervo." onPress={() => setScreen("wardrobe")} />
              <MenuButton title="Gerador de Looks" caption="Acesse looks manuais e sugeridos." onPress={() => setScreen("generator")} />
              <MenuButton title="Histórico de Looks" caption="Veja os looks que você já salvou." onPress={() => setScreen("history")} />
              <MenuButton title="Créditos" caption="Consulte saldo e simule recargas." onPress={() => setScreen("credits")} />
            </View>
          </>
        ) : null}

        {screen === "models" ? (
          <>
            <ScreenHeader title="Modelos" subtitle="Carregue ou fotografe várias modelos e mantenha tudo salvo em uma pasta local do app." onBack={() => setScreen("home")} />
            <View style={styles.actionRow}>
              <Pressable style={styles.primaryButton} onPress={handleAddModelsFromLibrary}>
                <Text style={styles.primaryButtonText}>Carregar da galeria</Text>
              </Pressable>
              <Pressable style={styles.secondaryActionButton} onPress={handleAddModelFromCamera}>
                <Text style={styles.secondaryActionButtonText}>Tirar foto</Text>
              </Pressable>
            </View>
            {models.length === 0 ? <Text style={styles.emptyText}>Nenhuma modelo cadastrada ainda.</Text> : null}
            {models.map((model) => (
              <View key={model.id} style={styles.catalogCard}>
                <Image source={{ uri: model.image.uri }} style={styles.catalogImage} />
                <TextInput
                  value={model.name}
                  onChangeText={(value) => setCatalog((current) => current ? { ...current, models: current.models.map((item) => item.id === model.id ? { ...item, name: value } : item) } : current)}
                  onEndEditing={(event) => handleRenameModel(model.id, event.nativeEvent.text)}
                  style={styles.input}
                />
                <Text style={styles.catalogCaption}>Salva localmente no aparelho</Text>
                <Pressable style={styles.linkButton} onPress={() => handleRemoveModel(model.id)}>
                  <Text style={styles.linkButtonText}>Remover modelo</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {screen === "wardrobe" ? (
          <>
            <ScreenHeader title="Meu Guarda-Roupas" subtitle="Cadastre peças do seu acervo, renomeie cada item e ajuste a categoria quando quiser." onBack={() => setScreen("home")} />
            <View style={styles.actionRow}>
              <Pressable style={styles.primaryButton} onPress={handleAddGarmentsFromLibrary}>
                <Text style={styles.primaryButtonText}>Carregar da galeria</Text>
              </Pressable>
              <Pressable style={styles.secondaryActionButton} onPress={handleAddGarmentFromCamera}>
                <Text style={styles.secondaryActionButtonText}>Tirar foto</Text>
              </Pressable>
            </View>
            {garments.length === 0 ? <Text style={styles.emptyText}>Nenhuma peça cadastrada ainda.</Text> : null}
            {garments.map((garment) => (
              <View key={garment.id} style={styles.catalogCard}>
                <Image source={{ uri: garment.image.uri }} style={styles.catalogImage} />
                <TextInput
                  value={garment.label}
                  onChangeText={(value) => setCatalog((current) => current ? { ...current, garments: current.garments.map((item) => item.id === garment.id ? { ...item, label: value } : item) } : current)}
                  onEndEditing={() => handleRenameGarment(garment)}
                  style={styles.input}
                />
                <View style={styles.chipRow}>
                  {(Object.keys(categoryLabels) as GarmentCategory[]).map((category) => (
                    <Pressable
                      key={category}
                      style={[styles.chip, garment.category === category && styles.chipActive]}
                      onPress={async () => {
                        const next = await localCatalogService.updateGarment(garment.id, { category });
                        setCatalog((current) => (current ? { ...current, garments: next } : current));
                      }}
                    >
                      <Text style={[styles.chipText, garment.category === category && styles.chipTextActive]}>{categoryLabels[category]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.linkButton} onPress={() => handleRemoveGarment(garment.id)}>
                  <Text style={styles.linkButtonText}>Remover peça</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {screen === "generator" ? (
          <>
            <ScreenHeader title="Gerador de Looks" subtitle="Escolha entre montar um look manualmente ou receber sugestões guiadas por prompt." onBack={() => setScreen("home")} />
            <View style={styles.menuGrid}>
              <MenuButton title="Looks Manuais" caption="Escolha a modelo e vista as peças manualmente." onPress={() => setScreen("manual-looks")} />
              <MenuButton title="Looks Sugeridos" caption="Use prompts para receber propostas prontas." onPress={() => setScreen("suggested-looks")} />
            </View>
          </>
        ) : null}

        {screen === "manual-looks" ? (
          <>
            <ScreenHeader title="Looks Manuais" subtitle="Selecione a modelo e as peças que deseja vestir antes de gerar a renderização." onBack={() => setScreen("generator")} />
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>1. Escolha a modelo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {models.map((model) => (
                  <Pressable
                    key={model.id}
                    style={[styles.selectionCard, selectedManualModelId === model.id && styles.selectionCardActive]}
                    onPress={() => setSelectedManualModelId(model.id)}
                  >
                    <Image source={{ uri: model.image.uri }} style={styles.selectionImage} />
                    <Text style={styles.selectionTitle}>{model.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>2. Escolha as peças</Text>
              {garments.map((garment) => (
                <Pressable
                  key={garment.id}
                  style={[styles.listRow, selectedManualGarmentIds.includes(garment.id) && styles.listRowActive]}
                  onPress={() => toggleManualGarment(garment.id)}
                >
                  <Image source={{ uri: garment.image.uri }} style={styles.rowImage} />
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{garment.label}</Text>
                    <Text style={styles.rowCaption}>{categoryLabels[garment.category]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={generateManualLook}>
              <Text style={styles.primaryButtonText}>Gerar look manual</Text>
            </Pressable>

            {manualPreview ? (
              <View style={styles.resultCard}>
                {manualPreview.previewUri ? <Image source={{ uri: manualPreview.previewUri }} style={styles.resultPreview} /> : null}
                <Text style={styles.resultTitle}>{manualPreview.title}</Text>
                <Text style={styles.resultSummary}>{manualPreview.summary}</Text>
                {manualPreview.trendComment ? (
                  <View style={styles.trendBox}>
                    <Text style={styles.trendLabel}>Tendências de moda</Text>
                    <Text style={styles.trendText}>{manualPreview.trendComment}</Text>
                  </View>
                ) : null}
                <TextInput value={manualLookName} onChangeText={setManualLookName} placeholder="Nome para salvar este look" placeholderTextColor="#8f8579" style={styles.input} />
                <Pressable style={styles.secondaryActionButton} onPress={saveManualLook}>
                  <Text style={styles.secondaryActionButtonText}>Salvar no histórico</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        {screen === "suggested-looks" ? (
          <>
            <ScreenHeader title="Looks Sugeridos" subtitle="Gere primeiro uma sugestão em texto e renderize a imagem só quando quiser consumir mais créditos." onBack={() => setScreen("generator")} />
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>1. Escolha ou escreva o prompt</Text>
              <View style={styles.chipRow}>
                {promptSuggestions.map((prompt) => (
                  <Pressable
                    key={prompt}
                    style={[styles.chip, selectedSuggestedPrompt === prompt && styles.chipActive]}
                    onPress={() => setSelectedSuggestedPrompt((current) => (current === prompt ? "" : prompt))}
                  >
                    <Text style={[styles.chipText, selectedSuggestedPrompt === prompt && styles.chipTextActive]}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={customSuggestedPrompt}
                onChangeText={setCustomSuggestedPrompt}
                placeholder="Ou digite seu próprio prompt"
                placeholderTextColor="#8f8579"
                multiline
                style={[styles.input, styles.textArea]}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>2. Escolha a modelo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {models.map((model) => (
                  <Pressable
                    key={model.id}
                    style={[styles.selectionCard, selectedSuggestedModelId === model.id && styles.selectionCardActive]}
                    onPress={() => setSelectedSuggestedModelId(model.id)}
                  >
                    <Image source={{ uri: model.image.uri }} style={styles.selectionImage} />
                    <Text style={styles.selectionTitle}>{model.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>3. Como a IA deve trabalhar?</Text>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.rowTitle}>Usar peças salvas</Text>
                  <Text style={styles.rowCaption}>
                    {garments.length > 0
                      ? "No modo texto, a IA analisa todo o acervo por nome e categoria, sem enviar fotos."
                      : "Sem peças cadastradas, o app usa o prompt livre em modo texto."}
                  </Text>
                </View>
                <Switch
                  value={useSavedPieces}
                  onValueChange={(value) => {
                    setUseSavedPieces(value);
                    if (!value) {
                      setRenderSuggestedImage(false);
                    }
                  }}
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.rowTitle}>Renderizar imagem</Text>
                  <Text style={styles.rowCaption}>
                    {canRenderSuggestedImage
                      ? "Opcional e mais caro: use apenas quando quiser vestir a modelo com fotos reais das peças salvas."
                      : "Para prompt livre, esta geração cria a sugestão em texto. Para imagem, cadastre Blusa, Calça ou Vestido."}
                  </Text>
                </View>
                <Switch value={effectiveRenderSuggestedImage} disabled={!canRenderSuggestedImage} onValueChange={setRenderSuggestedImage} />
              </View>

              {effectiveRenderSuggestedImage ? (
                <>
                  <Text style={styles.label}>Fundo da foto</Text>
                  <View style={styles.chipRow}>
                    {environmentSuggestions.map((item) => (
                      <Pressable
                        key={item}
                        style={[styles.chip, !customEnvironment.trim() && selectedEnvironment === item && styles.chipActive]}
                        onPress={() => {
                          setSelectedEnvironment(item);
                          setCustomEnvironment("");
                        }}
                      >
                        <Text style={[styles.chipText, !customEnvironment.trim() && selectedEnvironment === item && styles.chipTextActive]}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={customEnvironment}
                    onChangeText={setCustomEnvironment}
                    placeholder="Ou digite o ambiente/fundo que quiser. Ex.: rooftop em Paris ao pôr do sol"
                    placeholderTextColor="#8f8579"
                    style={styles.input}
                  />
                  <Text style={styles.rowCaption}>
                    A IA tentará usar esse ambiente como fundo principal da imagem. Para controle fiel de cenário, prefira OpenAI; a PiAPI/Kling pode preservar mais o fundo original da foto.
                  </Text>
                </>
              ) : null}

              <Text style={styles.creditHint}>Custo desta geração: {describeCreditCost(effectiveRenderSuggestedImage)} crédito(s)</Text>
            </View>

            <Pressable style={styles.primaryButton} onPress={generateSuggestedLook}>
              <Text style={styles.primaryButtonText}>Gerar sugestão</Text>
            </Pressable>

            {suggestedPreview ? (
              <View style={styles.resultCard}>
                {suggestedPreview.previewUri ? <Image source={{ uri: suggestedPreview.previewUri }} style={styles.resultPreview} /> : null}
                <Text style={styles.resultTitle}>{suggestedPreview.title}</Text>
                <Text style={styles.resultSummary}>{suggestedPreview.summary}</Text>
                {suggestedPreview.trendComment ? (
                  <View style={styles.trendBox}>
                    <Text style={styles.trendLabel}>Tendências de moda</Text>
                    <Text style={styles.trendText}>{suggestedPreview.trendComment}</Text>
                  </View>
                ) : null}
                <TextInput value={suggestedLookName} onChangeText={setSuggestedLookName} placeholder="Nome para salvar este look" placeholderTextColor="#8f8579" style={styles.input} />
                <Pressable style={styles.secondaryActionButton} onPress={saveSuggestedLook}>
                  <Text style={styles.secondaryActionButtonText}>Salvar no histórico</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        {screen === "history" ? (
          <>
            <ScreenHeader title="Histórico de Looks" subtitle="Reveja os looks já salvos, com modo de geração, modelo usada e resumo da proposta." onBack={() => setScreen("home")} />
            {savedLooks.length === 0 ? <Text style={styles.emptyText}>Nenhum look salvo ainda.</Text> : null}
            {savedLooks.map((look) => (
              <View key={look.id} style={styles.resultCard}>
                {look.previewUri ? <Image source={{ uri: look.previewUri }} style={styles.resultPreview} /> : null}
                <Text style={styles.resultTitle}>{look.name}</Text>
                <Text style={styles.rowCaption}>{look.mode === "manual" ? "Look manual" : "Look sugerido"} • {look.modelName} • {formatDate(look.createdAt)}</Text>
                <Text style={styles.resultSummary}>{look.summary}</Text>
                {look.trendComment ? (
                  <View style={styles.trendBox}>
                    <Text style={styles.trendLabel}>Tendências de moda</Text>
                    <Text style={styles.trendText}>{look.trendComment}</Text>
                  </View>
                ) : null}
                <Text style={styles.promptText}>{look.prompt}</Text>
              </View>
            ))}
          </>
        ) : null}

        {screen === "credits" ? (
          <>
            <ScreenHeader title="Créditos" subtitle="Acompanhe seu saldo e simule recargas para seguir gerando novos looks." onBack={() => setScreen("home")} />
            <View style={styles.creditPanel}>
              <Text style={styles.creditBannerLabel}>Saldo atual</Text>
              <Text style={styles.creditMainValue}>{credits?.balance ?? 0} créditos</Text>
              <Text style={styles.creditHint}>Look manual: 1 crédito • Look sugerido com imagem: 3 créditos</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.primaryButton} onPress={() => topUpCredits(10)}>
                <Text style={styles.primaryButtonText}>Adicionar 10</Text>
              </Pressable>
              <Pressable style={styles.secondaryActionButton} onPress={() => topUpCredits(25)}>
                <Text style={styles.secondaryActionButtonText}>Adicionar 25</Text>
              </Pressable>
              <Pressable style={styles.secondaryActionButton} onPress={() => topUpCredits(50)}>
                <Text style={styles.secondaryActionButtonText}>Adicionar 50</Text>
              </Pressable>
            </View>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Movimentações</Text>
              {credits?.history.map((entry) => (
                <View key={entry.id} style={styles.listRow}>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{entry.description}</Text>
                    <Text style={styles.rowCaption}>{formatDate(entry.createdAt)}</Text>
                  </View>
                  <Text style={[styles.creditMovement, entry.amount > 0 ? styles.creditPositive : styles.creditNegative]}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {isBusy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color="#1e3d59" />
            <Text style={styles.loadingText}>Processando...</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4efe7",
  },
  container: {
    padding: 20,
    paddingBottom: 48,
    gap: 18,
  },
  hero: {
    backgroundColor: "#f8f4ee",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e0d4c4",
    gap: 10,
  },
  eyebrow: {
    color: "#8a4b2f",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    color: "#1f2933",
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "800",
  },
  subtitle: {
    color: "#4f5d6b",
    fontSize: 15,
    lineHeight: 22,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f0e4d4",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#314352",
    fontWeight: "800",
  },
  menuGrid: {
    gap: 12,
  },
  menuButton: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 6,
  },
  menuButtonTitle: {
    color: "#1f2933",
    fontSize: 20,
    fontWeight: "800",
  },
  menuButtonCaption: {
    color: "#5f6b76",
    fontSize: 14,
    lineHeight: 20,
  },
  creditBanner: {
    backgroundColor: "#1e3d59",
    borderRadius: 24,
    padding: 18,
  },
  creditBannerLabel: {
    color: "#e9dcc9",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  creditBannerValue: {
    color: "#fff7ee",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
  },
  creditMainValue: {
    color: "#1f2933",
    fontSize: 28,
    fontWeight: "900",
  },
  panel: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 12,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  collapsibleCopy: {
    flex: 1,
    gap: 6,
  },
  collapseIndicator: {
    color: "#cc5f35",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#22313f",
    fontSize: 19,
    fontWeight: "800",
  },
  actionRow: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#1e3d59",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff7ee",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryActionButton: {
    backgroundColor: "#cc5f35",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryActionButtonText: {
    color: "#fff8ee",
    fontSize: 15,
    fontWeight: "800",
  },
  catalogCard: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 10,
  },
  catalogImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 18,
    backgroundColor: "#eadfce",
  },
  catalogCaption: {
    color: "#7a6c5a",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#f4ede4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbcbb7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#16202a",
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#f0e4d4",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: "#1e3d59",
  },
  chipText: {
    color: "#314352",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff7ee",
  },
  providerGrid: {
    gap: 10,
  },
  providerOption: {
    backgroundColor: "#f4ede4",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbcbb7",
    padding: 14,
    gap: 4,
  },
  providerOptionActive: {
    backgroundColor: "#13202b",
    borderColor: "#13202b",
  },
  providerTitle: {
    color: "#20303d",
    fontSize: 15,
    fontWeight: "800",
  },
  providerTitleActive: {
    color: "#fff8ed",
  },
  providerDescription: {
    color: "#6a7885",
    fontSize: 13,
    lineHeight: 18,
  },
  providerDescriptionActive: {
    color: "#e8d8c4",
  },
  linkButton: {
    alignSelf: "flex-start",
  },
  linkButtonText: {
    color: "#a23a2d",
    fontSize: 14,
    fontWeight: "700",
  },
  horizontalList: {
    gap: 12,
  },
  selectionCard: {
    width: 140,
    backgroundColor: "#fbf7f0",
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ebdfd0",
    gap: 8,
  },
  selectionCardActive: {
    borderColor: "#cc5f35",
    borderWidth: 2,
  },
  selectionImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 14,
    backgroundColor: "#eadfce",
  },
  selectionTitle: {
    color: "#20303d",
    fontSize: 14,
    fontWeight: "700",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fbf7f0",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ebdfd0",
  },
  listRowActive: {
    borderColor: "#cc5f35",
    borderWidth: 2,
  },
  rowImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#eadfce",
  },
  rowTextWrap: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: "#20303d",
    fontSize: 15,
    fontWeight: "700",
  },
  rowCaption: {
    color: "#6a7885",
    fontSize: 13,
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e9ddd0",
    gap: 12,
  },
  resultPreview: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 18,
    backgroundColor: "#eadfce",
  },
  resultTitle: {
    color: "#17212b",
    fontSize: 20,
    fontWeight: "800",
  },
  resultSummary: {
    color: "#5f6b76",
    fontSize: 14,
    lineHeight: 20,
  },
  trendBox: {
    backgroundColor: "#f6efe7",
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  trendLabel: {
    color: "#7b4a35",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  trendText: {
    color: "#30414e",
    fontSize: 13,
    lineHeight: 19,
  },
  promptText: {
    color: "#30414e",
    fontSize: 13,
    lineHeight: 19,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: "#4f5d6b",
    fontSize: 14,
    fontWeight: "700",
  },
  creditHint: {
    color: "#7b4a35",
    fontSize: 13,
    fontWeight: "700",
  },
  creditPanel: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e3d8c8",
    gap: 8,
  },
  creditMovement: {
    fontSize: 16,
    fontWeight: "800",
  },
  creditPositive: {
    color: "#2f7d48",
  },
  creditNegative: {
    color: "#a23a2d",
  },
  emptyText: {
    color: "#617180",
    fontSize: 14,
    lineHeight: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#4f5d6b",
    fontSize: 14,
  },
  busyOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 8,
  },
});
