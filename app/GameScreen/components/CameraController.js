import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import {
  DONE_LOOK,
  DONE_POS,
  FOLLOW_OFFSET,
  OVERVIEW_LEAD,
  OVERVIEW_OFFSET,
} from '../constants/camera';

const FOLLOW_DAMPING = 4.5;
const OVERVIEW_DAMPING = 3.2;

const CameraController = ({ mode, targetRef }) => {
  const { camera } = useThree();
  const lookAt = useRef(DONE_LOOK.clone());
  const desiredCameraPosition = useMemo(() => new THREE.Vector3(), []);
  const desiredLookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    const isFollow = mode === 'follow' && Boolean(targetRef?.current);
    const damping = isFollow ? FOLLOW_DAMPING : OVERVIEW_DAMPING;
    const alpha = 1 - Math.exp(-damping * delta);

    if (isFollow) {
      const targetPosition = targetRef.current.position;
      desiredCameraPosition.copy(targetPosition).add(FOLLOW_OFFSET);

      camera.position.lerp(desiredCameraPosition, alpha);
      lookAt.current.lerp(targetPosition, alpha);
    } else if (targetRef?.current) {
      desiredLookAt.copy(targetRef.current.position).add(OVERVIEW_LEAD);
      desiredCameraPosition.copy(desiredLookAt).add(OVERVIEW_OFFSET);

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
