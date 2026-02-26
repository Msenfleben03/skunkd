import { useEffect, useState } from 'react';

export interface CardDimensions {
  /** Card width in px */
  w: number;
  /** Card height in px */
  h: number;
  /** Border radius in px */
  r: number;
  /** Guard rank font size in px */
  rankFont: number;
  /** Guard suit font size in px */
  suitFont: number;
  /** Center suit font size in px */
  centerFont: number;
  /** Watermark font size in px */
  watermarkFont: number;
  /** Guard inset: top/bottom offset */
  guardTop: number;
  /** Guard inset: left/right offset */
  guardLeft: number;
  /** Fan horizontal step between cards for different hand sizes */
  xStep: (count: number) => number;
  /** Fan container height in px */
  containerH: number;
  /** Mini card variant */
  mini: {
    w: number;
    h: number;
    r: number;
    rankFont: number;
    suitFont: number;
    centerFont: number;
    watermarkFont: number;
    guardTop: number;
    guardLeft: number;
  };
}

function computeSize(vw: number): CardDimensions {
  if (vw >= 1024) {
    return {
      w: 108, h: 151, r: 8,
      rankFont: 38, suitFont: 30, centerFont: 50, watermarkFont: 15,
      guardTop: 6, guardLeft: 6,
      xStep: (c) => c <= 4 ? 45 : c <= 6 ? 36 : 30,
      containerH: 151,
      mini: { w: 50, h: 70, r: 4, rankFont: 17, suitFont: 14, centerFont: 28, watermarkFont: 8, guardTop: 4, guardLeft: 4 },
    };
  }
  if (vw >= 768) {
    return {
      w: 90, h: 126, r: 7,
      rankFont: 32, suitFont: 25, centerFont: 42, watermarkFont: 13,
      guardTop: 5, guardLeft: 5,
      xStep: (c) => c <= 4 ? 38 : c <= 6 ? 30 : 26,
      containerH: 126,
      mini: { w: 44, h: 62, r: 4, rankFont: 15, suitFont: 12, centerFont: 24, watermarkFont: 8, guardTop: 3, guardLeft: 3 },
    };
  }
  // Mobile default
  return {
    w: 72, h: 101, r: 6,
    rankFont: 25, suitFont: 20, centerFont: 34, watermarkFont: 11,
    guardTop: 4, guardLeft: 4,
    xStep: (c) => c <= 4 ? 30 : c <= 6 ? 24 : 20,
    containerH: 101,
    mini: { w: 36, h: 50, r: 3, rankFont: 11, suitFont: 9, centerFont: 19, watermarkFont: 7, guardTop: 2, guardLeft: 3 },
  };
}

export function useCardSize(): CardDimensions {
  const [size, setSize] = useState<CardDimensions>(() =>
    computeSize(typeof window !== 'undefined' ? window.innerWidth : 390),
  );

  useEffect(() => {
    const update = () => setSize(computeSize(window.innerWidth));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}
