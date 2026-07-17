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
    const introTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    // Set initial states for the magical lens focus & glow effects
    gsap.set('.profile-frame', { filter: 'blur(20px)', scale: 1.12, opacity: 0 });
    gsap.set('.profile-glow', { scale: 0.2, opacity: 0 });
    gsap.set('.char-inner', { filter: 'drop-shadow(0 0 0px rgba(0, 238, 255, 0))' });

    // 1. Name — each character slides up from behind its overflow-hidden parent
    introTl.from('.char-inner', {
      y: '110%',
      duration: 1.0,
      stagger: 0.05,
    })
    // 1b. Light sweep/glow effect on characters as they appear
    .to('.char-inner', {
      filter: 'drop-shadow(0 0 15px rgba(0, 238, 255, 0.8))',
      color: '#ffffff',
      duration: 0.4,
      stagger: 0.05,
    }, 0)
    // 1c. Transition character fill from solid white to transparent (revealing gradient) and settle glow
    .to('.char-inner', {
      '--text-fill': 'rgba(255, 255, 255, 0)',
      filter: 'drop-shadow(0 0 3px rgba(0, 238, 255, 0.25))',
      duration: 1.2,
      stagger: 0.04,
      ease: 'power2.out'
    }, 0.4)
    // 2. Tagline — each word/separator fades + rises after name finishes
    .from('.tagline-word, .tagline-sep', {
      opacity: 0,
      y: 18,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out'
    }, '-=0.5')
    // 3. Subtitle + CTA buttons cascade in
    .from('.hero-subtitle', {
      opacity: 0,
      y: 16,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.5')
    .from('.cta-buttons', {
      opacity: 0,
      y: 16,
      duration: 0.7,
      ease: 'power3.out'
    }, '-=0.6')
    // 4. Magical Profile photo entrance (lens focus + expanding aura glow)
    .to('.profile-glow', {
      opacity: 0.8,
      scale: 1.1,
      duration: 1.5,
      ease: 'power3.out'
    }, '-=1.4')
    .to('.profile-frame', {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      duration: 1.6,
      ease: 'power4.out'
    }, '-=1.5');

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
          end: '+=50%',
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

}
