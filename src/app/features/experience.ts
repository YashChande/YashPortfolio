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
      description: 'Developed Docuvia end-to-end - an AI-powered document intelligence and risk analytics platform. Architected the full-stack system using Angular, C#, and Llama 3, enabling automated extraction of actionable insights and visual analytics from unstructured documents, currently live and in active development.',
      highlights: ['Angular', 'Llama 3', 'C#', 'TypeScript', 'SQLite', 'HTML5', 'CSS', 'PrimeNG'],
      logo: 'assets/docuvia.jpg',
      website: 'https://docuvia-frontend.onrender.com',
      badge: 'In Development'
    },
    {
      title: 'Software Developer',
      company: 'ARCON',
      period: 'June 2023 - July 2025',
      description: `Worked on ARCON's Security Compliance Management (SCM) product:
• Developed responsive Angular interfaces and backend APIs using .NET technologies, contributing to a full UI migration from legacy screens to a modern component-based architecture.
• Designed the Email configuration page and implemented Cron-based scheduling, automating recurring compliance report delivery and reducing manual intervention.
• Implemented lazy-loaded tree structures and optimized SQL Server operations using LINQ & Dapper, and contributed to a database migration from SQL Server to MySQL improving cross-platform portability.
• Resolved 200+ bugs of varying criticality across the SCM product, collaborating across teams to maintain product stability and accelerate release cycles.`,
      highlights: ['Angular & TypeScript', '.NET & C#', 'SQL Server & MySQL', 'Email Automation', 'Security Compliance', 'LINQ', 'Debugging'],
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
