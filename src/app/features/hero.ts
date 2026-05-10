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
  @ViewChild('heroContent') heroContent!: ElementRef;
  @ViewChild('profilePic') profilePic!: ElementRef;

  constructor(private animService: AnimationService) {}

  ngAfterViewInit() {
    const gsap = this.animService.gsap;
    
    const tl = gsap.timeline();
    
    tl.from('.hero-title span', {
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
  }

  scrollToAbout() {
    this.animService.scrollTo('#about');
  }
}
