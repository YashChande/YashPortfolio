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
      description: 'Developing Docuvia end-to-end - an AI-powered document intelligence and risk analytics platform. Implementing the full-stack system using Angular, C#, and Ollama Llama 3 Large Language Model (LLM), enabling automated extraction of actionable insights and visual analytics from unstructured documents, currently live and in active development.',
      highlights: ['Angular', 'Llama 3', 'LLM', 'C#', 'TypeScript', 'SQLite', 'HTML5', 'CSS', 'PrimeNG'],
      logo: 'assets/docuvia.jpg',
      website: 'https://docuvia-frontend.onrender.com',
      badge: 'In Development'
    },
    {
      title: 'Software Developer',
      company: 'ARCON',
      period: 'June 2023 - July 2025',
      description: `Worked on ARCON's Security Compliance Management (SCM) product:
• Built responsive Angular interfaces and .NET APIs, driving a full UI migration from legacy screens to a modern component-based architecture.
• Designed email configuration with Cron-based scheduling, automating compliance report delivery and reducing manual intervention.
• Implemented lazy-loaded tree structures and optimized SQL Server operations via LINQ & Dapper; contributed to a SQL Server → MySQL migration for cross-platform portability.
• Resolved 200+ bugs across the SCM product, collaborating cross-functionally to maintain stability and accelerate release cycles.`,
      highlights: ['Angular & TypeScript', '.NET & C#', 'SQL Server & MySQL', 'Email Automation', 'Security Compliance', 'LINQ', 'Debugging'],
      logo: 'assets/arcon_risk_control_logo.jpg',
      website: 'https://cloudscdm-mumbai.arconnet.com/'
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
