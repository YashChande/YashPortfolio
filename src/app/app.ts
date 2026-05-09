import { Component, AfterViewInit, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
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

  constructor(
    private animationService: AnimationService,
    private threeService: ThreeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.threeService.init(this.bgContainer.nativeElement);
      this.initCustomCursor();
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
