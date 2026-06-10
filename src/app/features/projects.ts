import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss'
})
export class ProjectsComponent implements AfterViewInit {
  projects = [
    {
      title: 'Automobile Verification System',
      category: 'Research Publication',
      image: 'assets/asset_management.png',
      description: 'Authentication system for manufacturing units using yawn detection and vehicle verification. Published in IRJMETS Volume 5.',
      tags: ['Python', 'Automation', 'Manufacturing', 'Research'],
      link: 'https://drive.google.com/file/d/19Ozql_o579aWcmxLB9Pm3-683A_AVIPi/view'
    },
    {
      title: 'Skin Cancer Detection',
      category: 'Deep Learning',
      image: 'assets/cyber_dashboard.png',
      description: 'AI-powered diagnostic tool using CNN and YOLO with PyTorch and DenseNet for accurate image classification.',
      tags: ['PyTorch', 'YOLO', 'CNN', 'Medical AI'],
      link: '#'
    },
    {
      title: 'Covid-19 Tracker',
      category: 'Web Application',
      image: 'assets/analytics_system.png',
      description: 'Interactive hotspot tracking application with live data visualization using Folium and Django.',
      tags: ['Django', 'Python', 'Folium', 'Data Viz'],
      link: '#'
    },
    {
      title: 'Translation Ally',
      category: 'Hackathon Project',
      image: 'assets/compliance_tool.png',
      description: 'Grand Finale Finalist project for Smart India Hackathon 2022. Document and speech-to-speech translation.',
      tags: ['Django', 'Python', 'SIH 2022'],
      link: 'https://translation-ally-6wbv.onrender.com/'
    }
  ];

  certifications = [
    {
      title: 'Smart India Hackathon Finalist',
      issuer: 'Ministry of Education, India',
      date: 'Aug 2022',
      link: 'https://drive.google.com/file/d/1rep4XwLAc0HXHqXVMGrxIdphP9-vRR-m/view?usp=sharing',
      isSIH: true
    },
    {
      title: 'Entrepreneurial Management',
      issuer: 'Great Learning',
      date: 'Dec 2025',
      link: 'https://www.mygreatlearning.com/certificate/XFCTJCOC',
      icon: '🚀'
    }
  ];

  constructor(private animService: AnimationService) { }

  ngAfterViewInit() {
    const gsap = this.animService.gsap;

    gsap.fromTo('.project-card',
      { y: 50, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.projects-grid',
          start: 'top 85%',
        },
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: 'power4.out',
        clearProps: 'opacity'
      }
    );
  }
}
