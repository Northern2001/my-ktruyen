"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Image as DreiImage, Text, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, FrontSide, Mesh, Object3D, PerspectiveCamera, ShaderMaterial } from "three";
import type { DisplayMode, DisplayStyle, GalleryItem } from "./mkt-types";
import { sitePath } from "../lib/site-path";

const geistMonoFontUrl = sitePath("/fonts/GeistMono-Variable.ttf");
const geistMonoBoldFontUrl = sitePath("/fonts/GeistMono-Bold.ttf");

function playClickSound() {
  window.dispatchEvent(new Event("mkt-click"));
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function getTrackLabel(numberTrack: number) {
  return numberTrack === 0 ? "TRAILER" : `TRACK ${numberTrack.toString().padStart(2, "0")}`;
}

function isDarkTrackNumber(numberTrack: number) {
  return numberTrack === 8 || numberTrack === 27 || numberTrack === 28 || numberTrack === 29;
}

function setMaterialUniform(material: unknown, uniformName: string, value: number) {
  if (!material || typeof material !== "object" || !("uniforms" in material)) return;

  const uniforms = (material as { uniforms?: Record<string, { value: number }> }).uniforms;
  if (uniforms?.[uniformName]) uniforms[uniformName].value = value;
}

const imageVertexShader = `
  uniform float uBend;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float edgeCurve = position.x * position.x;
    transformed.x += uBend * edgeCurve * 0.22;
    transformed.z -= abs(uBend) * edgeCurve * 0.12;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const imageFragmentShader = `
  uniform sampler2D uMap;
  uniform float uFlashProgress;
  uniform float uFlashIntensity;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 centeredUv = vUv - 0.5;
    float radius = length(centeredUv);
    float time = uFlashProgress * 6.28318;
    float pulse = uFlashIntensity;
    float waveA = sin(centeredUv.y * 24.0 + time * 2.1);
    float waveB = cos(centeredUv.x * 19.0 - time * 1.7);
    float waveC = sin((centeredUv.x + centeredUv.y) * 31.0 + time * 2.8);
    vec2 distortion = vec2(waveA + waveC * 0.45, waveB - waveC * 0.35);
    vec2 warpedUv = clamp(vUv + distortion * pulse * 0.008 * (1.0 - radius), 0.002, 0.998);
    vec4 imageColor = texture2D(uMap, warpedUv);

    float plasmaWave = 0.5 + 0.5 * sin(
      centeredUv.x * 15.0 - centeredUv.y * 18.0 + time * 2.6 + waveA * 1.4
    );
    float plasmaCore = pow(1.0 - smoothstep(0.03, 0.68, radius), 1.7);
    vec3 plasmaColor = mix(vec3(0.92, 0.97, 1.0), vec3(1.0, 0.91, 0.97), plasmaWave);
    imageColor.rgb += plasmaColor * plasmaCore * plasmaWave * pulse * 0.12;
    imageColor.rgb *= 1.0 + pulse * 0.22;

    gl_FragColor = vec4(imageColor.rgb, imageColor.a * uOpacity);
  }
`;

const flashVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const flashFragmentShader = `
  uniform float uProgress;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 centeredUv = vUv - 0.5;
    float easedProgress = smoothstep(0.0, 1.0, uProgress);
    float radius = length(centeredUv);
    float time = easedProgress * 6.28318;
    float plasmaA = sin(centeredUv.x * 18.0 + sin(centeredUv.y * 9.0 + time) * 2.2 - time * 1.8);
    float plasmaB = cos(centeredUv.y * 22.0 + cos(centeredUv.x * 11.0 - time) * 1.8 + time * 2.1);
    float plasmaField = 0.5 + 0.5 * sin(plasmaA * 2.4 + plasmaB * 2.0 + time * 1.7);
    float radialAura = pow(1.0 - smoothstep(0.04, 0.78, radius), 1.8);
    float filament = smoothstep(0.58, 0.95, plasmaField) * (1.0 - smoothstep(0.45, 0.9, radius));
    float alpha = (radialAura * (0.28 + plasmaField * 0.28) + filament * 0.28) * uIntensity;
    vec3 glowColor = mix(vec3(0.94, 0.98, 1.0), vec3(1.0, 0.93, 0.98), plasmaField);

    gl_FragColor = vec4(glowColor, alpha * 0.56);
  }
`;

function ItemCaption({
  item,
  position,
  rotation,
  width,
}: {
  item: GalleryItem;
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
}) {
  const hasSubtitle = item.subtitle.length > 0;
  const durationSeconds = item.durationSeconds;
  const trackNumberLabel = getTrackLabel(item.numberTrack);
  const trackNumberWidth = trackNumberLabel.length * 0.0264;
  const metadataColor = isDarkTrackNumber(item.numberTrack) ? "#080808" : "#ffffff";
  const captionColor = "#ffffff";
  const captionShadowOffsetX = "1.5%";
  const captionShadowOffsetY = "-2.5%";
  const captionShadowBlur = "3%";

  return (
    <group position={position} rotation={rotation}>
      <Text
        font={geistMonoFontUrl}
        position={[0, 0, 0]}
        raycast={() => {}}
        anchorX="left"
        anchorY="top"
        color={metadataColor}
        fontSize={0.04}
        lineHeight={1}
        maxWidth={width}
        letterSpacing={0.06}
        renderOrder={1}
        depthOffset={-4}
        material-side={FrontSide}
        material-toneMapped={false}
        outlineColor="#000000"
        outlineOpacity={0}
        outlineOffsetX={captionShadowOffsetX}
        outlineOffsetY={captionShadowOffsetY}
        outlineBlur={captionShadowBlur}
      >
        {trackNumberLabel}
      </Text>
      {durationSeconds != null && (
        <>
          <Text
            font={geistMonoFontUrl}
            position={[trackNumberWidth + 0.025, 0, 0]}
            raycast={() => {}}
            anchorX="left"
            anchorY="top"
            color={metadataColor}
            fontSize={0.04}
            lineHeight={1}
            letterSpacing={0.06}
            renderOrder={1}
            depthOffset={-4}
            material-side={FrontSide}
            material-toneMapped={false}
            outlineColor="#000000"
            outlineOpacity={0}
            outlineOffsetX={captionShadowOffsetX}
            outlineOffsetY={captionShadowOffsetY}
            outlineBlur={captionShadowBlur}
          >
            /
          </Text>
          <Text
            font={geistMonoFontUrl}
            position={[trackNumberWidth + 0.075, 0, 0]}
            raycast={() => {}}
            anchorX="left"
            anchorY="top"
            color={metadataColor}
            fontSize={0.04}
            lineHeight={1}
            letterSpacing={0.06}
            renderOrder={1}
            depthOffset={-4}
            material-side={FrontSide}
            material-toneMapped={false}
            outlineColor="#000000"
            outlineOpacity={0}
            outlineOffsetX={captionShadowOffsetX}
            outlineOffsetY={captionShadowOffsetY}
            outlineBlur={captionShadowBlur}
          >
            {formatTime(durationSeconds)}
          </Text>
        </>
      )}
      <Text
        font={geistMonoBoldFontUrl}
        position={[0, -0.07, 0]}
        raycast={() => {}}
        anchorX="left"
        anchorY="top"
        color={captionColor}
        fontSize={0.075}
        maxWidth={width}
        letterSpacing={0.01}
        renderOrder={1}
        depthOffset={-4}
        material-side={FrontSide}
        material-toneMapped={false}
        outlineColor="#000000"
        outlineOpacity={0.64}
        outlineOffsetX={captionShadowOffsetX}
        outlineOffsetY={captionShadowOffsetY}
        outlineBlur={captionShadowBlur}
      >
        {item.title.toUpperCase()}
      </Text>
      {hasSubtitle && (
        <Text
          font={geistMonoFontUrl}
          position={[0, -0.16, 0]}
          raycast={() => {}}
          anchorX="left"
          anchorY="top"
          color={captionColor}
          fontSize={0.04}
          maxWidth={width - 0.2}
          letterSpacing={0.02}
          renderOrder={1}
          depthOffset={-4}
          material-side={FrontSide}
          material-toneMapped={false}
          outlineColor="#000000"
          outlineOpacity={0}
          outlineOffsetX={captionShadowOffsetX}
          outlineOffsetY={captionShadowOffsetY}
          outlineBlur={captionShadowBlur}
        >
          {item.subtitle.toUpperCase()}
        </Text>
      )}
    </group>
  );
}

function CanvasPlayingIndicator({
  active,
  position,
  color,
}: {
  active: boolean;
  position: [number, number, number];
  color: string;
}) {
  const barsRef = useRef<Object3D>(null);
  const barCount = 6;
  const barWidth = 0.009;
  const barGap = 0.009;
  const maxHeight = 0.06;

  useFrame(({ clock }) => {
    if (!active || !barsRef.current) return;

    const time = clock.elapsedTime;
    barsRef.current.children.forEach((bar, index) => {
      const wave = 0.5 + 0.5 * Math.sin(time * 7.2 + index * 1.15);
      bar.scale.y = 0.4 + wave * 0.6;
    });
  });

  if (!active) return null;

  return (
    <group ref={barsRef} position={position} raycast={() => {}} renderOrder={4}>
      {Array.from({ length: barCount }, (_, index) => (
        <mesh
          key={index}
          position={[(index - (barCount - 1) / 2) * (barWidth + barGap), 0, 0]}
          raycast={() => {}}
        >
          <planeGeometry args={[barWidth, maxHeight]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function MKTTitle({ isMobile }: { isMobile: boolean }) {
  return (
    <DreiImage
      url={sitePath("/images/mkt-logo.svg")}
      scale={isMobile ? [2.8, 0.48] : [4.4, 0.76]}
      transparent
      toneMapped={false}
    />
  );
}

function SceneCamera({ displayStyle, isMobile }: { displayStyle: DisplayStyle; isMobile: boolean }) {
  const { camera } = useThree();
  const perspectiveCamera = camera as PerspectiveCamera;
  const previousStyleRef = useRef<DisplayStyle | null>(null);
  const transitionRef = useRef<{
    kind: "initial" | "to-center" | "to-observatory" | "to-wave";
    elapsed: number;
    startZ: number;
    startFov: number;
    startY: number;
  }>({ kind: "initial", elapsed: 0, startZ: 14, startFov: 42, startY: 0 });

  useEffect(() => {
    const nextKind =
      displayStyle === "art" ? "to-center" : displayStyle === "wave" ? "to-wave" : "to-observatory";
    if (previousStyleRef.current == null) {
      transitionRef.current = {
        kind: "initial",
        elapsed: 0,
        startZ: camera.position.z,
        startFov: perspectiveCamera.fov,
        startY: camera.position.y,
      };
    } else if (previousStyleRef.current !== displayStyle) {
      transitionRef.current = {
        kind: nextKind,
        elapsed: 0,
        startZ: camera.position.z,
        startFov: perspectiveCamera.fov,
        startY: camera.position.y,
      };
    }
    previousStyleRef.current = displayStyle;
  }, [camera, displayStyle]);

  useFrame((_, delta) => {
    // A portrait phone is far narrower than the river is wide, so the wave has to
    // be watched from further back there to keep both columns on screen.
    const targetZ =
      displayStyle === "art" ? 0.85 : displayStyle === "wave" ? (isMobile ? 7.6 : 4.5) : isMobile ? 7 : 6;
    const targetFov =
      displayStyle === "art"
        ? isMobile ? 70 : 62
        : displayStyle === "wave"
          ? isMobile ? 58 : 52
          : isMobile ? 55 : 50;
    const targetY = displayStyle === "wave" ? -1.35 : 0;
    const transition = transitionRef.current;
    const duration = transition.kind === "initial" ? 1.8 : 1.45;
    transition.elapsed = Math.min(duration, transition.elapsed + delta);
    const progress = Math.min(1, transition.elapsed / duration);
    const easedProgress = progress * progress * (3 - 2 * progress);
    let animatedZ = targetZ;

    if (transition.kind === "to-observatory") {
      const peakZ = 9.5;
      if (progress < 0.58) {
        const peakProgress = (progress / 0.58) * (progress / 0.58) * (3 - 2 * (progress / 0.58));
        animatedZ = transition.startZ + (peakZ - transition.startZ) * peakProgress;
      } else {
        const settleProgress = (progress - 0.58) / 0.42;
        const easedSettle = settleProgress * settleProgress * (3 - 2 * settleProgress);
        animatedZ = peakZ + (targetZ - peakZ) * easedSettle;
      }
    } else {
      animatedZ = transition.startZ + (targetZ - transition.startZ) * easedProgress;
    }

    // The wave style pulls the camera much closer, so the observatory pull-back
    // is capped to avoid a jump away from the flow before it settles.
    camera.position.z = displayStyle === "wave" ? Math.min(animatedZ, targetZ + 0.9) : animatedZ;
    camera.position.y = transition.startY + (targetY - transition.startY) * easedProgress;
    perspectiveCamera.fov = transition.startFov + (targetFov - transition.startFov) * easedProgress;
    camera.lookAt(0, displayStyle === "wave" ? -1 : 0, 0);
    camera.updateProjectionMatrix();
  });

  return null;
}

function ImageTube({
  items,
  tubeCols,
  tubeRowSpacing,
  tubeScrollLimit,
  scrollTargetRef,
  focusItemRef,
  isDraggingRef,
  spinVelocityRef,
  naturalDirRef,
  dragDeltaRef,
  suppressClickUntilRef,
  onImageClick,
  displayMode,
  displayStyle,
  playingTrackIndex,
}: {
  items: readonly GalleryItem[];
  tubeCols: number;
  tubeRowSpacing: number;
  tubeScrollLimit: number;
  scrollTargetRef: React.MutableRefObject<number>;
  focusItemRef: React.MutableRefObject<number | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  spinVelocityRef: React.MutableRefObject<number>;
  naturalDirRef: React.MutableRefObject<number>;
  dragDeltaRef: React.MutableRefObject<number>;
  suppressClickUntilRef: React.MutableRefObject<number>;
  onImageClick: (projectName: string, imageUrl: string, textureIndex: number) => void;
  displayMode: DisplayMode;
  displayStyle: DisplayStyle;
  playingTrackIndex: number | null;
}) {
  const groupRef = useRef<Object3D>(null);
  const rowGroupRefs = useRef<Array<Object3D | null>>([]);
  const itemGroupRefs = useRef<Array<Object3D | null>>([]);
  const itemMeshRefs = useRef<Array<Mesh | null>>([]);
  const itemBackMeshRefs = useRef<Array<Mesh | null>>([]);
  const flashOverlayMeshRefs = useRef<Array<Mesh | null>>([]);
  const flashOverlayBackMeshRefs = useRef<Array<Mesh | null>>([]);
  // The wave style lays the same cards out on a flowing river instead of the
  // tube, so it keeps its own refs indexed by layout position (not by track).
  const waveGroupRefs = useRef<Array<Object3D | null>>([]);
  const waveMeshRefs = useRef<Array<Mesh | null>>([]);
  const waveBackMeshRefs = useRef<Array<Mesh | null>>([]);
  const waveFlashOverlayMeshRefs = useRef<Array<Mesh | null>>([]);
  const waveFlashOverlayBackMeshRefs = useRef<Array<Mesh | null>>([]);
  const waveBendValues = useRef<number[]>([]);
  const waveHasEntered = useRef<boolean[]>([]);
  const waveIsVisible = useRef<boolean[]>([]);
  const scrollCurrent = useRef(0);
  const angle = useRef(0);
  const focusAngleTarget = useRef<number | null>(null);
  const focusStartedAt = useRef(-1);
  const flashItemIndex = useRef(-1);
  const flashStartedAt = useRef(-1);
  const selectionSequence = useRef<{
    // Index into the ref arrays of the active style (layout position for the
    // wave, track index for the tube).
    itemIndex: number;
    textureIndex: number;
    projectName: string;
    imageUrl: string;
    holdStartedAt: number;
    activatedAt: number;
    resumeAt: number;
  } | null>(null);
  const lastItemActivationAt = useRef(0);
  const itemVisibility = useRef(1);
  const displayTransition = useRef({ phase: "idle", start: -1, target: displayMode });
  const [tubeLayoutMode, setTubeLayoutMode] = useState<DisplayMode>(displayMode);

  const imageUrls = useMemo(() => [...new Set(items.map((item) => item.imageUrl))], []);

  const textures = useTexture(imageUrls);
  const texturesByUrl = useMemo(
    () => new Map(imageUrls.map((url, index) => [url, textures[index]])),
    [imageUrls, textures],
  );

  const activeItems = useMemo(
    () => items.map((item, index) => ({ item, index })).filter(({ item }) => tubeLayoutMode === "full" || item.type === "pulled"),
    [tubeLayoutMode],
  );
  const isWave = displayStyle === "wave";
  // The river runs two cards abreast, so every row holds a left/right pair.
  const cols = Math.min(isWave ? 2 : tubeCols, activeItems.length);
  const rows = Math.ceil(activeItems.length / cols);
  const radius = 3.2;
  const tileH = 1.5;
  const ySpacing = tubeRowSpacing;
  const totalRows = rows;

  const rowSpeed = useMemo(() => {
    const speeds: number[] = [];
    for (let r = 0; r < rows; r++) {
      const t = rows <= 1 ? 0 : r / (rows - 1);
      speeds.push(0.65 + t * 0.9);
    }
    return speeds;
  }, [rows]);

  const rowPositions = useMemo(() => {
    const out: Array<{
      rowIndex: number;
      y: number;
      baseRow: number;
      rowOffset: number;
      itemCount: number;
    }> = [];
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      if (isWave) {
        // Rows are placed per frame along the river, so they start flat here.
        const itemCount = Math.min(cols, activeItems.length - rowIndex * cols);
        out.push({ rowIndex, y: 0, baseRow: rowIndex, rowOffset: 0, itemCount });
        continue;
      }
      const y = (rowIndex - (totalRows - 1) / 2) * ySpacing;
      const baseRow = rowIndex % rows;
      const rowOffset = baseRow % 2 === 0 ? 0 : 0.5;
      const itemCount = Math.min(cols, activeItems.length - baseRow * cols);
      out.push({ rowIndex, y, baseRow, rowOffset, itemCount });
    }
    return out.filter(({ itemCount }) => itemCount > 0);
  }, [activeItems.length, cols, isWave, rows, totalRows, ySpacing]);

  const waveEntries = useMemo(
    () =>
      isWave
        ? activeItems.map((_, layoutIndex) => ({ layoutIndex, groupIndex: Math.floor(layoutIndex / cols) }))
        : [],
    [activeItems, cols, isWave],
  );
  // Reuse the tube's scroll range so the wheel and drag gestures keep the same
  // feel; one scroll unit then maps onto `scrollRowFactor` river rows.
  const scrollRowFactor = Math.max(1, Math.max(rows - 1, 0) / Math.max(tubeScrollLimit, 0.001));
  const targetViewTheta = displayStyle === "art" ? -Math.PI / 2 : Math.PI / 2;

  useEffect(() => {
    if (displayMode === tubeLayoutMode) {
      if (displayTransition.current.phase === "rebuild") return;
      if (displayTransition.current.phase !== "idle") {
        displayTransition.current = { phase: "idle", start: -1, target: displayMode };
        itemVisibility.current = 1;
      }
      return;
    }

    displayTransition.current = {
      phase: "spin",
      start: -1,
      target: displayMode,
    };
  }, [displayMode, tubeLayoutMode]);

  useEffect(() => {
    if (displayTransition.current.phase === "rebuild") {
      displayTransition.current.phase = "fade-in";
      displayTransition.current.start = -1;
    }
  }, [tubeLayoutMode]);

  useEffect(() => {
    // Every card has to flow in from the back again after the river is rebuilt.
    waveBendValues.current = [];
    waveHasEntered.current = [];
    waveIsVisible.current = [];
  }, [isWave, tubeLayoutMode]);

  useFrame((state, dt) => {
    const now = performance.now();
    const scrollLerp = isWave
      ? 1 - Math.exp(-(isDraggingRef.current ? 16 : 5.2) * dt)
      : isDraggingRef.current ? 0.42 : 0.12;
    scrollCurrent.current += (scrollTargetRef.current - scrollCurrent.current) * scrollLerp;

    // The river loops, so only the tube clamps its scroll to the last row.
    if (!isWave) {
      const activeScrollLimit = ((rows - 1) * tubeRowSpacing) / 2;
      scrollCurrent.current = Math.max(-activeScrollLimit, Math.min(activeScrollLimit, scrollCurrent.current));
      scrollTargetRef.current = Math.max(-activeScrollLimit, Math.min(activeScrollLimit, scrollTargetRef.current));
    }

    const requestedFocusIndex = focusItemRef.current;
    if (requestedFocusIndex != null) {
      focusItemRef.current = null;
      const activePosition = activeItems.findIndex(({ index }) => index === requestedFocusIndex);
      if (activePosition >= 0) {
        const targetRowIndex = Math.floor(activePosition / cols);
        const targetRow = rowPositions[targetRowIndex];
        const targetCol = activePosition % cols;
        if (targetRow && isWave) {
          // Scroll to the nearest loop of the requested row instead of rewinding
          // the river all the way back to it.
          const nearestLoop = Math.round((-scrollCurrent.current * scrollRowFactor - targetRowIndex) / rows);
          scrollTargetRef.current = -(targetRowIndex + nearestLoop * rows) / scrollRowFactor;
        } else if (targetRow) {
          const targetTheta =
            Math.PI - ((targetCol + targetRow.rowOffset + 0.5) / targetRow.itemCount) * Math.PI * 2;
          const targetRowRotation = targetTheta - targetViewTheta;
          const targetAngle = targetRowRotation / rowSpeed[targetRow.baseRow];
          const rowAnglePeriod = (Math.PI * 2) / rowSpeed[targetRow.baseRow];
          const nearestTurn = Math.round((angle.current - targetAngle) / rowAnglePeriod);
          focusAngleTarget.current = targetAngle + nearestTurn * rowAnglePeriod;
          focusStartedAt.current = now;
          scrollTargetRef.current = targetRow.y;
        }
      }
    }

    const damping = 0.92;
    spinVelocityRef.current *= Math.pow(damping, dt * 60);
    spinVelocityRef.current = Math.max(-2.0, Math.min(2.0, spinVelocityRef.current));

    const transition = displayTransition.current;
    let displaySpinBoost = 0;
    if (transition.phase !== "idle") {
      if (transition.start < 0) transition.start = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - transition.start;

      if (transition.phase === "spin") {
        displaySpinBoost = 5.2 * (1 - Math.min(1, elapsed / 0.34));
        if (elapsed >= 0.34) {
          transition.phase = "fade-out";
          transition.start = -1;
        }
      } else if (transition.phase === "fade-out") {
        const progress = Math.min(1, elapsed / 0.32);
        itemVisibility.current = 1 - (1 - Math.pow(1 - progress, 3));
        displaySpinBoost = 2.2 * (1 - progress);

        if (progress >= 1) {
          itemVisibility.current = 0;
          transition.phase = "rebuild";
          transition.start = -1;
          setTubeLayoutMode(transition.target);
        }
      } else if (transition.phase === "fade-in") {
        const progress = Math.min(1, elapsed / 0.52);
        itemVisibility.current = 1 - Math.pow(1 - progress, 3);
        displaySpinBoost = 1.15 * (1 - progress);

        if (progress >= 1) {
          itemVisibility.current = 1;
          transition.phase = "idle";
          transition.start = -1;
        }
      }
    }

    const baseSpeed = naturalDirRef.current * (0.14 + displaySpinBoost);
    angle.current += dragDeltaRef.current;
    dragDeltaRef.current = 0;
    if (focusAngleTarget.current != null) {
      const remaining = focusAngleTarget.current - angle.current;
      angle.current += remaining * Math.min(1, dt * 7.5);
      if (Math.abs(remaining) < 0.003 || now - focusStartedAt.current >= 480) {
        angle.current = focusAngleTarget.current;
        scrollCurrent.current = scrollTargetRef.current;
        focusAngleTarget.current = null;
        focusStartedAt.current = -1;
        if (selectionSequence.current) {
          selectionSequence.current.holdStartedAt = now;
        }
      }
    } else if (
      !selectionSequence.current ||
      selectionSequence.current.holdStartedAt < 0 ||
      (selectionSequence.current.activatedAt > 0 && now >= selectionSequence.current.resumeAt)
    ) {
      angle.current += (baseSpeed + spinVelocityRef.current) * dt;
    }

    const activeSelection = selectionSequence.current;
    if (activeSelection && activeSelection.holdStartedAt >= 0) {
      const holdElapsed = now - activeSelection.holdStartedAt;

      if (activeSelection.activatedAt < 0 && holdElapsed >= 250 && flashItemIndex.current < 0) {
        flashItemIndex.current = activeSelection.itemIndex;
        flashStartedAt.current = now;
      }

      if (activeSelection.activatedAt < 0 && holdElapsed >= 500) {
        activeSelection.activatedAt = now;
        activeSelection.resumeAt = now + 250;
        onImageClick(activeSelection.projectName, activeSelection.imageUrl, activeSelection.textureIndex);
      }

      if (activeSelection.activatedAt > 0 && now >= activeSelection.resumeAt) {
        selectionSequence.current = null;
      }
    }
    const group = groupRef.current;
    if (!group) return;

    group.position.y = isWave ? 0 : -scrollCurrent.current;

    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const rowObj = rowGroupRefs.current[rowIndex];
      if (!rowObj) continue;
      if (isWave) {
        rowObj.rotation.y = 0;
        continue;
      }
      const baseRow = rowIndex % rows;
      rowObj.rotation.y = angle.current * rowSpeed[baseRow];
    }

    if (isWave) {
      const scrolledRows = -scrollCurrent.current * scrollRowFactor;

      waveEntries.forEach(({ groupIndex, layoutIndex }) => {
        const itemGroup = waveGroupRefs.current[layoutIndex];
        if (!itemGroup) return;

        const side = layoutIndex % cols === 0 ? -1 : 1;
        // Wrap each row into [-rows/2, rows/2) so the river never runs dry.
        const relativeRow = (((groupIndex - scrolledRows + rows / 2) % rows) + rows) % rows - rows / 2;
        // Log depth keeps far rows readable instead of collapsing to a point.
        const depth = (Math.log1p(Math.abs(relativeRow)) / Math.LN2) * Math.sign(relativeRow);
        const spread = Math.min(0.26, 0.09 * Math.max(depth, 0));
        // Rows that passed the camera sweep outwards and off the sides.
        const passed = Math.max(0, Math.max(-relativeRow, 0) - 0.56);
        const exit = 1 - (1 + passed / 0.55) * Math.exp(-passed / 0.55);

        itemGroup.position.set(
          side * (1.18 + spread) + 3.5 * exit * side,
          -1.22 + 1.32 * depth - 0.9 * exit + 0.1 * Math.abs(side),
          -(1.1 * depth) - 0.22 * Math.abs(side),
        );
        itemGroup.rotation.set(0, -side * Math.min(0.42, 0.42 * exit), side * Math.min(0.16, 0.16 * exit));
        waveBendValues.current[layoutIndex] = -side * Math.min(0.55, 0.55 * exit);

        if (relativeRow >= 0) waveHasEntered.current[layoutIndex] = true;
        // Hold a card hidden until it has flowed in once, then drop it after it
        // has drifted well past the camera.
        waveIsVisible.current[layoutIndex] =
          waveHasEntered.current[layoutIndex] === true && relativeRow > -2.2;
      });
    }

    const visibility = itemVisibility.current;
    const activeGroupRefs = isWave ? waveGroupRefs.current : itemGroupRefs.current;
    const activeMeshRefs = isWave ? waveMeshRefs.current : itemMeshRefs.current;
    const activeBackMeshRefs = isWave ? waveBackMeshRefs.current : itemBackMeshRefs.current;
    const activeFlashRefs = isWave ? waveFlashOverlayMeshRefs.current : flashOverlayMeshRefs.current;
    const activeFlashBackRefs = isWave
      ? waveFlashOverlayBackMeshRefs.current
      : flashOverlayBackMeshRefs.current;

    activeGroupRefs.forEach((itemGroup, layoutIndex) => {
      if (!itemGroup) return;
      const isFlowVisible = !isWave || waveIsVisible.current[layoutIndex] !== false;
      itemGroup.visible = visibility > 0.01 && isFlowVisible;
      itemGroup.scale.setScalar(Math.max(0.001, visibility));
    });
    activeMeshRefs.forEach((mesh, layoutIndex) => {
      if (!mesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = visibility;
        setMaterialUniform(material, "uOpacity", visibility);
        setMaterialUniform(material, "uBend", isWave ? waveBendValues.current[layoutIndex] ?? 0 : 0);
      });
    });
    activeBackMeshRefs.forEach((mesh, layoutIndex) => {
      if (!mesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = visibility;
        setMaterialUniform(material, "uOpacity", visibility);
        setMaterialUniform(material, "uBend", isWave ? waveBendValues.current[layoutIndex] ?? 0 : 0);
      });
    });

    if (flashItemIndex.current >= 0) {
      const elapsed = now - flashStartedAt.current;
      const flashDuration = 500;
      const progress = Math.min(1, elapsed / flashDuration);
      const flashIntensity = Math.sin(progress * Math.PI);
      const flashIndex = flashItemIndex.current;
      [activeMeshRefs[flashIndex], activeBackMeshRefs[flashIndex]].forEach((mesh) => {
        if (!mesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          setMaterialUniform(material, "uFlashProgress", progress);
          setMaterialUniform(material, "uFlashIntensity", flashIntensity);
        });
      });
      [activeFlashRefs[flashIndex], activeFlashBackRefs[flashIndex]].forEach((mesh) => {
        if (!mesh) return;
        mesh.visible = true;
        const material = mesh.material as ShaderMaterial;
        material.uniforms.uProgress.value = progress;
        material.uniforms.uIntensity.value = flashIntensity;
        material.opacity = 1;
      });

      if (progress >= 1) {
        [activeMeshRefs[flashIndex], activeBackMeshRefs[flashIndex]].forEach((mesh) => {
          if (!mesh) return;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => {
            setMaterialUniform(material, "uFlashProgress", 0);
            setMaterialUniform(material, "uFlashIntensity", 0);
          });
        });
        [activeFlashRefs[flashIndex], activeFlashBackRefs[flashIndex]].forEach((mesh) => {
          if (!mesh) return;
          mesh.visible = false;
          const material = mesh.material as ShaderMaterial;
          material.uniforms.uIntensity.value = 0;
        });
        flashItemIndex.current = -1;
        flashStartedAt.current = -1;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {rowPositions.map(({ rowIndex, y, baseRow, rowOffset, itemCount }) => (
        <group
          key={rowIndex}
          position={[0, y, 0]}
          ref={(obj) => {
            rowGroupRefs.current[rowIndex] = obj;
          }}
        >
          {Array.from({ length: itemCount }).map((_, col) => {
            const theta = Math.PI - ((col + rowOffset + 0.5) / itemCount) * Math.PI * 2;
            const side = col === 0 ? -1 : 1;
            const restDepth = Math.log1p(baseRow) / Math.LN2;
            const restSpread = Math.min(0.26, 0.09 * restDepth);
            // Wave cards get their real transform per frame; these are only the
            // resting places they mount at.
            const x = isWave ? side * (1.18 + restSpread) : Math.cos(theta) * radius;
            const z = isWave ? -(1.1 * restDepth) - 0.22 * Math.abs(side) : Math.sin(theta) * radius;
            const ry = isWave ? 0 : -(theta + Math.PI / 2);
            const layoutIndex = baseRow * cols + col;
            const activeItem = activeItems[baseRow * cols + col];
            const { item, index: texIndex } = activeItem;
            const texture = texturesByUrl.get(item.imageUrl);
            const textureImage = texture?.image as { width?: number; height?: number } | undefined;
            const imageAspect =
              textureImage?.width && textureImage.height ? textureImage.width / textureImage.height : 1;
            const tileW = tileH * imageAspect;
            const captionPadding = 0.05;
            const captionWidth = Math.min(tileW - captionPadding * 2, 1.35);
            const openImageDetail = (event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              if (displayMode === "pulled" && item.type === "stream") return;
              const now = performance.now();
              if (now < suppressClickUntilRef.current || now - lastItemActivationAt.current < 100) return;
              lastItemActivationAt.current = now;

              if (isWave) {
                // Bring the card's row back to the head of the river.
                const nearestLoop = Math.round((-scrollCurrent.current * scrollRowFactor - baseRow) / rows);
                scrollTargetRef.current = -(baseRow + nearestLoop * rows) / scrollRowFactor;
              } else {
                // A positive Y rotation moves the card's position from theta to
                // theta - rowRotation. At rowRotation = theta - PI / 2, this
                // card is on the camera's center axis and its back face points
                // toward the camera.
                const targetRowRotation = theta - targetViewTheta;
                const targetAngle = targetRowRotation / rowSpeed[baseRow];
                // Each row has its own angular speed, so its equivalent full
                // rotations in `angle.current` are 2π / rowSpeed, not 2π.
                const rowAnglePeriod = (Math.PI * 2) / rowSpeed[baseRow];
                const nearestTurn = Math.round((angle.current - targetAngle) / rowAnglePeriod);
                focusAngleTarget.current = targetAngle + nearestTurn * rowAnglePeriod;
                focusStartedAt.current = now;
                scrollTargetRef.current = y;
              }

              selectionSequence.current = {
                itemIndex: isWave ? layoutIndex : texIndex,
                textureIndex: texIndex,
                projectName: item.title,
                imageUrl: item.imageUrl,
                // The wave has no focus spin to wait on, so the hold starts now.
                holdStartedAt: isWave ? now : -1,
                activatedAt: -1,
                resumeAt: -1,
              };
              playClickSound();
            };

            return (
              <group
                key={texIndex}
                position={[x, 0, z]}
                rotation={[0, ry, 0]}
                ref={(obj) => {
                  if (isWave) waveGroupRefs.current[layoutIndex] = obj;
                  else itemGroupRefs.current[texIndex] = obj;
                }}
                visible={itemVisibility.current > 0.01}
                scale={Math.max(0.001, itemVisibility.current)}
              >
                <mesh
                  ref={(mesh) => {
                    if (isWave) waveMeshRefs.current[layoutIndex] = mesh;
                    else itemMeshRefs.current[texIndex] = mesh;
                  }}
                  onPointerUp={openImageDetail}
                  onClick={openImageDetail}
                >
                  <planeGeometry args={[tileW, tileH]} />
                  <shaderMaterial
                    transparent
                    toneMapped={false}
                    vertexShader={imageVertexShader}
                    fragmentShader={imageFragmentShader}
                    uniforms={{
                      uMap: { value: texture },
                      uFlashProgress: { value: 0 },
                      uFlashIntensity: { value: 0 },
                      uOpacity: { value: itemVisibility.current },
                      uBend: { value: 0 },
                    }}
                  />
                  <ItemCaption
                    item={item}
                    position={[-tileW / 2 + captionPadding, tileH / 2 - captionPadding, 0.024]}
                    width={captionWidth}
                  />
                  <CanvasPlayingIndicator
                    active={playingTrackIndex === texIndex}
                    color={isDarkTrackNumber(item.numberTrack) ? "#080808" : "#ffffff"}
                    position={[tileW / 2 - 0.15, -tileH / 2 + 0.14, 0.035]}
                  />
                </mesh>
                <mesh
                  ref={(mesh) => {
                    if (isWave) waveFlashOverlayMeshRefs.current[layoutIndex] = mesh;
                    else flashOverlayMeshRefs.current[texIndex] = mesh;
                  }}
                  position={[0, 0, 0.03]}
                  renderOrder={3}
                  visible={false}
                >
                  <planeGeometry args={[tileW, tileH]} />
                  <shaderMaterial
                    transparent
                    depthTest={false}
                    depthWrite={false}
                    blending={AdditiveBlending}
                    vertexShader={flashVertexShader}
                    fragmentShader={flashFragmentShader}
                    uniforms={{
                      uProgress: { value: 0 },
                      uIntensity: { value: 0 },
                    }}
                  />
                </mesh>
                <mesh
                  ref={(mesh) => {
                    if (isWave) waveBackMeshRefs.current[layoutIndex] = mesh;
                    else itemBackMeshRefs.current[texIndex] = mesh;
                  }}
                  rotation={[0, Math.PI, 0]}
                  onPointerUp={openImageDetail}
                  onClick={openImageDetail}
                >
                  <planeGeometry args={[tileW, tileH]} />
                  <shaderMaterial
                    transparent
                    toneMapped={false}
                    vertexShader={imageVertexShader}
                    fragmentShader={imageFragmentShader}
                    uniforms={{
                      uMap: { value: texture },
                      uFlashProgress: { value: 0 },
                      uFlashIntensity: { value: 0 },
                      uOpacity: { value: itemVisibility.current },
                      uBend: { value: 0 },
                    }}
                  />
                  <ItemCaption
                    item={item}
                    position={[-tileW / 2 + captionPadding, tileH / 2 - captionPadding, 0.024]}
                    width={captionWidth}
                  />
                  <CanvasPlayingIndicator
                    active={playingTrackIndex === texIndex}
                    color={isDarkTrackNumber(item.numberTrack) ? "#080808" : "#ffffff"}
                    position={[tileW / 2 - 0.15, -tileH / 2 + 0.14, 0.035]}
                  />
                </mesh>
                <mesh
                  ref={(mesh) => {
                    if (isWave) waveFlashOverlayBackMeshRefs.current[layoutIndex] = mesh;
                    else flashOverlayBackMeshRefs.current[texIndex] = mesh;
                  }}
                  position={[0, 0, 0.03]}
                  rotation={[0, Math.PI, 0]}
                  renderOrder={3}
                  visible={false}
                >
                  <planeGeometry args={[tileW, tileH]} />
                  <shaderMaterial
                    transparent
                    depthTest={false}
                    depthWrite={false}
                    blending={AdditiveBlending}
                    vertexShader={flashVertexShader}
                    fragmentShader={flashFragmentShader}
                    uniforms={{
                      uProgress: { value: 0 },
                      uIntensity: { value: 0 },
                    }}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}




export function MKTCanvas({
  items,
  tubeCols,
  tubeRowSpacing,
  tubeScrollLimit,
  scrollTargetRef,
  focusItemRef,
  isDraggingRef,
  spinVelocityRef,
  naturalDirRef,
  dragDeltaRef,
  suppressClickUntilRef,
  onImageClick,
  displayMode,
  displayStyle,
  isMobile,
  isActive,
  playingTrackIndex,
}: {
  items: readonly GalleryItem[];
  tubeCols: number;
  tubeRowSpacing: number;
  tubeScrollLimit: number;
  scrollTargetRef: React.MutableRefObject<number>;
  focusItemRef: React.MutableRefObject<number | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  spinVelocityRef: React.MutableRefObject<number>;
  naturalDirRef: React.MutableRefObject<number>;
  dragDeltaRef: React.MutableRefObject<number>;
  suppressClickUntilRef: React.MutableRefObject<number>;
  onImageClick: (projectName: string, imageUrl: string, textureIndex: number) => void;
  displayMode: DisplayMode;
  displayStyle: DisplayStyle;
  isMobile: boolean;
  isActive: boolean;
  playingTrackIndex: number | null;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 42 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      frameloop={isActive ? "always" : "never"}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0, 0);
        gl.setClearColor(0x000000, 0);
      }}
    >
      <SceneCamera displayStyle={displayStyle} isMobile={isMobile} />
      <Suspense fallback={null}>
        {displayStyle === "museum" && <MKTTitle isMobile={isMobile} />}
        <ImageTube
          items={items}
          tubeCols={tubeCols}
          tubeRowSpacing={tubeRowSpacing}
          tubeScrollLimit={tubeScrollLimit}
          scrollTargetRef={scrollTargetRef}
          focusItemRef={focusItemRef}
          isDraggingRef={isDraggingRef}
          spinVelocityRef={spinVelocityRef}
          naturalDirRef={naturalDirRef}
          dragDeltaRef={dragDeltaRef}
          suppressClickUntilRef={suppressClickUntilRef}
          onImageClick={onImageClick}
          displayMode={displayMode}
          displayStyle={displayStyle}
          playingTrackIndex={playingTrackIndex}
        />
      </Suspense>
    </Canvas>
  );
}
