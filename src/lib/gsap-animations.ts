'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Custom Hook: Stagger Animation for list/cards
 */
export function useGsapStagger<T extends HTMLElement>(
  selector: string = '.gsap-card',
  deps: any[] = []
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        selector,
        { opacity: 0, y: 20, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, deps);

  return containerRef;
}

/**
 * Custom Hook: Smooth Number Count-Up Animation
 */
export function useGsapCountUp<T extends HTMLElement>(endValue: number, duration: number = 1.2) {
  const elementRef = useRef<T | null>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    if (!elementRef.current || isNaN(endValue)) return;

    const obj = { value: prevValue.current };

    const ctx = gsap.context(() => {
      gsap.to(obj, {
        value: endValue,
        duration,
        ease: 'power1.out',
        onUpdate: () => {
          if (elementRef.current) {
            elementRef.current.textContent = new Intl.NumberFormat('th-TH', {
              style: 'currency',
              currency: 'THB',
              minimumFractionDigits: 2,
            }).format(obj.value);
          }
        },
      });
    });

    prevValue.current = endValue;
    return () => ctx.revert();
  }, [endValue, duration]);

  return elementRef;
}

/**
 * Custom Hook: Smooth Fade-In + Slide-Up
 */
export function useGsapFadeIn<T extends HTMLElement>(delay: number = 0) {
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elementRef.current,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay,
          ease: 'power2.out',
        }
      );
    });

    return () => ctx.revert();
  }, [delay]);

  return elementRef;
}
