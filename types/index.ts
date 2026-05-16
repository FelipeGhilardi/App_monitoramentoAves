export interface Bird {
  id: string;
  commonName: string;       // ex: "Beija-flor-de-topete"
  scientificName: string;   // ex: "Stephanoxis lalandi"
  imageUrl: string;
  confidence: number;       // 0 a 1 (ex: 0.985)
  detectedAt: string;       // ISO date string
  duration?: number;        // tempo no comedouro em minutos
  isFavorite?: boolean;
}

export interface Feeder {
  id: string;
  name: string;
  isOnline: boolean;
  streamUrl?: string;       // URL HLS para o stream ao vivo
  lastSeen?: string;
}

export interface Sighting {
  id: string;
  bird: Bird;
  feederId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
}