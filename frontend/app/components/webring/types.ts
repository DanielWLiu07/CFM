export interface Social {
  type: string;
  url: string;
}

export interface WebringEntry {
  name: string;
  url: string;
  tagline?: string;
  description: string;
  cohort: string;
  avatar?: string;
  websiteImage?: string;
  role?: string;
  location?: string;
  school?: string;
  quote?: string;
  year?: string;
  socials?: Social[];
}

export interface Node {
  x: number; y: number; z: number; // world position (animated toward target)
  targetX: number; targetY: number; targetZ: number; // layout target
  transitionT: number; // 0→1 progress
  nodeOpacity: number; // 0→1, for fade in/out
  removing: boolean;
  entry: WebringEntry;
  index: number;
  sx: number; sy: number; scale: number; depth: number; screenR: number; // projection cache
  hoverAnim: number;
  flashAnim: number; // 0→1 flash when packet arrives
  flashGreen: boolean; // true=green, false=red
  simValue: number; // running simulation value
  avatarImg: HTMLImageElement | null;
  lod: 0 | 1 | 2; // 0=dot, 1=simple, 2=full — persists to prevent flicker
}

export interface Edge { from: number; to: number; hoverAnim: number; packetGreen: boolean; }

export interface Camera {
  tx: number; ty: number; tz: number; // orbit target
  orbitTheta: number;  // azimuth
  orbitPhi: number;    // elevation (clamped)
  orbitDist: number;   // distance from target
  orbitThetaVel: number; // momentum
  bobPhase: number;
}

export interface FlyTo {
  startTarget: [number, number, number];
  endTarget: [number, number, number];
  startDist: number;
  endDist: number;
  startTheta?: number;
  endTheta?: number;
  startPhi?: number;
  endPhi?: number;
  t: number;
  duration: number;
}

export interface BoundingSphere { cx: number; cy: number; cz: number; radius: number; }

export interface WebringSectionProps {
  onVisibilityChange: (visible: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  reducedMotion?: boolean;
  sectionRefOut?: React.RefObject<HTMLElement | null>;
}
