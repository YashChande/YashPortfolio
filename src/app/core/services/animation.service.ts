import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  private lenis: Lenis | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initLenis();
    }
  }

  private initLenis() {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    const raf = (time: number) => {
      this.lenis?.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis?.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  get scrollTrigger() {
    return ScrollTrigger;
  }

  get gsap() {
    return gsap;
  }

  scrollTo(target: string | HTMLElement, offset: number = 0) {
    this.lenis?.scrollTo(target, { offset });
  }
}
