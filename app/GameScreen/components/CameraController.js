import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import {
  DONE_LOOK,
  DONE_POS,
  FOLLOW_OFFSET,
  setOverviewCameraPose,
} from '../constants/camera';

const FOLLOW_DAMPING = 4.5;
const OVERVIEW_DAMPING = 2.6;
const PARAMS_DAMPING = 2.2;
const MAX_FRAME_DELTA = 0.033; // 30fps floor to prevent delta spikes from causing sudden jumps

const CameraController = ({
  mode,
  overviewFocusOffset = 0,
  overviewPositions = [],
  overviewScaleMultiplier = 1,
  overviewTargetPosition,
  pieceRefs,
  targetRef,
}) => {
  const { camera, size } = useThree();
  const lookAt = useRef(DONE_LOOK.clone());
  const desiredCameraPosition = useMemo(() => new THREE.Vector3(), []);
  const desiredLookAt = useMemo(() => new THREE.Vector3(), []);

  // Smoothly interpolated camera parameters to prevent sudden 1-step snaps
  const smoothFocusOffset = useRef(0);
  const smoothScaleMultiplier = useRef(1);
  const smoothMaxScale = useRef(0.82);

  useFrame((_state, delta) => {
    // Clamp delta to prevent frame stutters / GC hitches from causing sudden teleports
    const safeDelta = Math.min(delta, MAX_FRAME_DELTA);

    const isLandscape = size?.width && size?.height ? size.width > size.height : true;
    const targetFocusOffset = isLandscape ? overviewFocusOffset : 0;
    const targetScaleMultiplier = overviewScaleMultiplier;
    const targetMaxScale = overviewPositions.length ? 1.38 : 0.82;

    // Smoothly transition parameters with exponential decay to avoid abrupt jumps
    const paramAlpha = 1 - Math.exp(-PARAMS_DAMPING * safeDelta);
    smoothFocusOffset.current = THREE.MathUtils.lerp(
      smoothFocusOffset.current,
      targetFocusOffset,
      paramAlpha
    );
    smoothScaleMultiplier.current = THREE.MathUtils.lerp(
      smoothScaleMultiplier.current,
      targetScaleMultiplier,
      paramAlpha
    );
    smoothMaxScale.current = THREE.MathUtils.lerp(
      smoothMaxScale.current,
      targetMaxScale,
      paramAlpha
    );

    const isFollow = mode === 'follow' && Boolean(targetRef?.current);
    const damping = isFollow ? FOLLOW_DAMPING : OVERVIEW_DAMPING;
    const alpha = 1 - Math.exp(-damping * safeDelta);

    if (isFollow) {
      const targetPosition = targetRef.current.position;
      desiredCameraPosition.copy(targetPosition).add(FOLLOW_OFFSET);

      camera.position.lerp(desiredCameraPosition, alpha);
      lookAt.current.lerp(targetPosition, alpha);
    } else if (setOverviewCameraPose({
      aspect: size?.width && size?.height ? size.width / size.height : camera.aspect,
      cameraPosition: desiredCameraPosition,
      extraPositions: overviewPositions,
      focusOffsetX: smoothFocusOffset.current,
      lookAt: desiredLookAt,
      maxScale: smoothMaxScale.current,
      pieceRefs,
      scaleMultiplier: smoothScaleMultiplier.current,
      targetPosition: overviewTargetPosition,
    })) {
      camera.position.lerp(desiredCameraPosition, alpha);
      lookAt.current.lerp(desiredLookAt, alpha);
    } else {
      camera.position.lerp(DONE_POS, alpha);
      lookAt.current.lerp(DONE_LOOK, alpha);
    }

    camera.lookAt(lookAt.current);
  });

  return null;
};

export default CameraController;
