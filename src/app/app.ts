import { Component, AfterViewInit, ElementRef, ViewChild, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header';
import { HeroComponent } from './features/hero';
import { AboutComponent } from './features/about';
import { SkillsComponent } from './features/skills';
import { ExperienceComponent } from './features/experience';
import { ProjectsComponent } from './features/projects';
import { ContactComponent } from './features/contact';
import { FooterComponent } from './features/footer';
import { AnimationService } from './core/services/animation.service';
import { ThreeService } from './core/services/three.service';
import { GameService } from './core/services/game.service';
import { AnalyticsService } from './core/services/analytics.service';

// Native game canvas dimensions
const GAME_W = 950;
const GAME_H = 780;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    HeroComponent,
    AboutComponent,
    SkillsComponent,
    ExperienceComponent,
    ProjectsComponent,
    ContactComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  @ViewChild('bgContainer', { static: true }) bgContainer!: ElementRef;

  // Computed scale factor so the game always fits the viewport
  public gameScale = 1;
  public isPortraitMobile = false;
  gameContainerStyle: Record<string, string> = {};
  gameIframeStyle: Record<string, string> = {};

  constructor(
    private animationService: AnimationService,
    private threeService: ThreeService,
    public gameService: GameService,
    private analyticsService: AnalyticsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.computeGameScale();
  }

  private computeGameScale() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Disable portrait warning to let mobile users play in portrait mode
    this.isPortraitMobile = false;

    const padding = 80; // total vertical + close-btn room
    const scaleX = (window.innerWidth - 32) / GAME_W;
    const scaleY = (window.innerHeight - padding) / GAME_H;
    this.gameScale = Math.min(1, scaleX, scaleY);

    const w = Math.floor(GAME_W * this.gameScale);
    const h = Math.floor(GAME_H * this.gameScale);

    this.gameContainerStyle = {
      width: `${w}px`,
      height: `${h}px`,
    };

    this.gameIframeStyle = {
      width: `${GAME_W}px`,
      height: `${GAME_H}px`,
      transform: `scale(${this.gameScale})`,
      transformOrigin: 'top left',
      border: 'none',
      background: 'black',
      display: 'block'
    };
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.threeService.init(this.bgContainer.nativeElement);
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (!isTouch) {
        this.initCustomCursor();
      }
      this.computeGameScale();

      // Recompute when the game modal opens
      this.gameService.isActive$.subscribe(active => {
        if (active) this.computeGameScale();
      });

      // Log the visit details
      this.analyticsService.logVisit();
    }
  }

  initCustomCursor() {
    const gsap = this.animationService.gsap;
    const arrow = document.querySelector('.cursor-arrow');
    const container = document.querySelector('.custom-cursor');

    if (!arrow) return;

    let mouseX = 0;
    let mouseY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      gsap.to(arrow, {
        x: mouseX,
        y: mouseY,
        duration: 0.1,
        ease: 'power2.out'
      });
    });

    // Hover effect for interactive elements
    const updateInteractivity = () => {
      const interactiveElements = document.querySelectorAll('a, button, .glass-card, input, textarea, .project-card, .timeline-content');
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => container?.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => container?.classList.remove('cursor-hover'));
      });
    };

    updateInteractivity();
    
    // Re-run periodically to catch dynamically rendered elements if any
    setTimeout(updateInteractivity, 2000);
  }
}
