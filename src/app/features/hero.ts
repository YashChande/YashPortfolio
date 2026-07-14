import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class HeroComponent implements AfterViewInit {
  @ViewChild('pinContainer', { static: true }) pinContainer!: ElementRef;
  @ViewChild('showcase', { static: true }) showcase!: ElementRef;
  @ViewChild('screenMask', { static: true }) screenMask!: ElementRef;
  @ViewChild('contentWrapper', { static: true }) contentWrapper!: ElementRef;
  @ViewChild('frameOverlay', { static: true }) frameOverlay!: ElementRef;
  @ViewChild('profilePic', { static: true }) profilePic!: ElementRef;

  public isMobile = false;

  constructor(private animService: AnimationService) {}

  ngAfterViewInit() {
    const gsap = this.animService.gsap;
    
    // Play page-load entrance animation
    const introTl = gsap.timeline();
    introTl.from('.hero-title span', {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power4.out'
    })
    .from('.hero-tagline', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.5')
    .from('.hero-subtitle', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.5')
    .from('.profile-container', {
      opacity: 0,
      scale: 0.8,
      duration: 1.2,
      ease: 'expo.out'
    }, '-=0.8');

    // Interactive mouse move parallax for profile photo
    window.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const x = (clientX - window.innerWidth / 2) / 20;
      const y = (clientY - window.innerHeight / 2) / 20;

      if (this.profilePic) {
        gsap.to(this.profilePic.nativeElement, {
          x: x,
          y: y,
          duration: 1,
          ease: 'power2.out'
        });
      }
    });

    // Wire up iPhone Zoom-out ScrollTrigger animation
    this.initScrollAnimations();
  }

  private initScrollAnimations() {
    const gsap = this.animService.gsap;
    const ScrollTrigger = this.animService.scrollTrigger;

    const setupShowcase = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // Calculate final target iPhone size on desktop / mobile
      this.isMobile = vw <= 768;
      
      let phoneW: number;
      let phoneH: number;
      let maskW: number;
      let maskH: number;

      if (this.isMobile) {
        // Portrait phone on mobile
        phoneH = vh * 0.7;
        phoneW = phoneH * (1406 / 2822);
        maskW = phoneW * 0.93;
        maskH = phoneH * 0.956;
      } else {
        // Landscape phone on desktop (swapped width/height aspect ratios)
        phoneH = vh * 0.65;
        phoneW = phoneH * (2822 / 1406);
        maskW = phoneW * 0.956;
        maskH = phoneH * 0.93;
      }

      // S_start: Scale factor to make the inner screen mask cover the viewport initially
      const startScale = Math.max(vw / maskW, vh / maskH);

      // S_end: Scale factor of the hero content wrapper to fit inside the phone screen mask
      // On desktop, we scale it to fit the height of the phone screen.
      // On mobile, we scale it to fit the width of the phone screen.
      const endScale = this.isMobile ? (maskW / vw) * 0.88 : (maskH / vh);

      // Set initial dimensions & scales
      gsap.set(this.showcase.nativeElement, {
        width: phoneW,
        height: phoneH,
        scale: startScale
      });

      gsap.set(this.contentWrapper.nativeElement, {
        xPercent: -50,
        yPercent: -50,
        width: vw,
        height: vh,
        scale: 1 / startScale
      });

      // Configure SVG frame overlay sizing and rotation (only rotated for desktop landscape)
      const frameImg = this.frameOverlay.nativeElement.querySelector('.iphone-frame-img');
      if (this.isMobile) {
        gsap.set(this.frameOverlay.nativeElement, { width: phoneW, height: phoneH });
        gsap.set(frameImg, {
          width: '100%',
          height: '100%',
          rotation: 0
        });
      } else {
        gsap.set(this.frameOverlay.nativeElement, { width: phoneW, height: phoneH });
        gsap.set(frameImg, {
          width: phoneH, // Swap width and height for pre-rotation layout sizing
          height: phoneW,
          rotation: -90
        });
      }

      gsap.set(this.frameOverlay.nativeElement, {
        opacity: 0,
        scale: 1.2
      });

      // Clear existing ScrollTrigger to handle browser resizing safely
      ScrollTrigger.getById('hero-iphone-zoom')?.kill();

      // Create scroll timeline pinned showcase
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          id: 'hero-iphone-zoom',
          trigger: this.pinContainer.nativeElement,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      // Animation steps scrubbed to scroll position
      scrollTl.to(this.showcase.nativeElement, {
        scale: 1,
        ease: 'power1.inOut'
      }, 0)
      .to(this.contentWrapper.nativeElement, {
        scale: endScale,
        ease: 'power1.inOut'
      }, 0)
      .to(this.frameOverlay.nativeElement, {
        opacity: 1,
        scale: 1,
        ease: 'power1.inOut'
      }, 0);

      // Force refresh ScrollTrigger to recalculate all triggers in the correct order
      ScrollTrigger.refresh();
    };

    // Run setup and listen for layout resizes
    setTimeout(setupShowcase, 100);
    window.addEventListener('resize', setupShowcase);
  }

  scrollToAbout() {
    this.animService.scrollTo('#about');
  }
}
