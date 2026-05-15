import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.html',
  styleUrl: './experience.scss'
})
export class ExperienceComponent implements AfterViewInit {
  experiences = [
    {
      title: 'Software Developer',
      company: 'Arcon Techsolutions',
      period: 'June 2023 - July 2025',
      description: 'Developed and enhanced enterprise security product features, including an email automation module with configurable reporting and scheduling. Focused on client-driven enhancements, data encryption, and critical bug resolution.',
      highlights: ['Angular & TypeScript', '.NET & C#', 'SQL-based Databases', 'Email Automation', 'Security Compliance']
    },
    {
      title: 'Information Technology Engineer',
      company: 'Academic Projects & Training',
      period: '2019 - 2023',
      description: 'Developed various engineering projects including a Skin Cancer Detection system and a Covid-19 Tracker. Focused on web technologies and data analytics.',
      highlights: ['Python & Django', 'Full-stack Development', 'System Design']
    }
  ];

  constructor(private animService: AnimationService) {}

  ngAfterViewInit() {
    const gsap = this.animService.gsap;
    
    gsap.from('.timeline-item', {
      scrollTrigger: {
        trigger: '.timeline',
        start: 'top 80%',
      },
      x: -50,
      opacity: 0,
      duration: 1,
      stagger: 0.3,
      ease: 'power3.out'
    });
  }
}
