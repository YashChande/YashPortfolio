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
      title: 'Founder',
      company: 'Docuvia',
      period: 'July 2025 - Present',
      description: 'Docuvia is an AI-powered document intelligence, risk analytics, and decision support platform that transforms unstructured documents into actionable insights, visual analytics, and measurable improvement over time.',
      highlights: ['Angular', 'Llama 3', 'C#', 'TypeScript', 'SQLite', 'HTML5', 'CSS', 'PrimeNG'],
      logo: 'assets/docuvia.jpg'
    },
    {
      title: 'Software Developer',
      company: 'ARCON',
      period: 'June 2023 - July 2025',
      description: 'Developed and enhanced enterprise security product features, including an email automation module with configurable reporting and scheduling. Focused on client-driven enhancements, data encryption, and critical bug resolution.',
      highlights: ['Angular & TypeScript', '.NET & C#', 'SQL-based Databases', 'Email Automation', 'Security Compliance'],
      logo: 'assets/arcon_risk_control_logo.jpg'
    },
    {
      title: 'Web Development Intern',
      company: 'Lets Grow More',
      period: 'Sep 2022 - Oct 2022',
      description: 'Built a website to create a To-Do list, student enrollment form and a calculator.',
      highlights: ['HTML', 'CSS', 'Javascript', 'React'],
      logo: 'assets/letsgrowmore_logo.jpg'
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
