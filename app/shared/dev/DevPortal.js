import React, { useState } from 'react';
import { isDevPortalEnabled } from './devConfig';
import DevPortalButton from './DevPortalButton';
import DevPortalModal from './DevPortalModal';

export default function DevPortal({ activeRoute }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isDevPortalEnabled()) {
    return null;
  }

  return (
    <>
      <DevPortalButton onPress={() => setIsOpen(true)} />
      <DevPortalModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        activeRoute={activeRoute}
      />
    </>
  );
}
