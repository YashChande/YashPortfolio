import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class AboutComponent implements AfterViewInit {
  education = [
    {
      degree: 'Master of Science - Web and Data Science',
      school: 'University of Koblenz, Germany',
      period: 'April 2026 - March 2028',
      details: 'Specializing in web technologies and data science at EQF level 7.'
    },
    {
      degree: 'Bachelor of Engineering - Information Technology',
      school: 'University of Mumbai, India',
      period: 'August 2019 - May 2023',
      details: 'Core training in programming, data structures, databases, and system design. EQF level 6.'
    }
  ];

  constructor(private animService: AnimationService) {}

  ngAfterViewInit() {
    const gsap = this.animService.gsap;
    
    gsap.from('.about-content', {
      scrollTrigger: {
        trigger: '.about-section',
        start: 'top 80%',
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });

    gsap.fromTo('.edu-item', 
      { x: -30, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.education-list',
          start: 'top 85%',
        },
        x: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out',
        clearProps: 'opacity'
      }
    );
  }
}
