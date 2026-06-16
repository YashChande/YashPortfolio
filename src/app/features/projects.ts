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
      date: 'April 2023',
      image: 'assets/automobile_verification.png',
      description: 'Authentication system for manufacturing units using yawn detection and vehicle verification. Published in IRJMETS Volume 5.',
      tags: ['Python', 'Automation', 'Manufacturing', 'Research'],
      link: 'https://drive.google.com/file/d/19Ozql_o579aWcmxLB9Pm3-683A_AVIPi/view',
      buttonLabel: 'View Credential'
    },
    {
      title: 'Translation Ally',
      category: 'National-Level Hackathon Project',
      date: 'Aug 2022',
      image: 'assets/translator1.jpg',
      description: 'Built a real-time document and speech-to-speech translation and transcription platform supporting multiple languages',
      tags: ['Django', 'Python', 'NLP', 'SIH 2022'],
      link: 'https://translation-ally-6wbv.onrender.com/',
      buttonLabel: 'Visit Deployed Site'
    },
    {
      title: 'Skin Cancer Detection',
      category: 'Deep Learning',
      date: 'Jan 2022 – Jun 2022',
      image: 'assets/skin_cancer_detection.png',
      description: 'Developed a website to detect skin cancer to aid doctors and patients for early diagnosis of the disease. Incorporated deep learning concepts like CNN and YOLO for faster and accurate image classification. Used packages like PyTorch and DenseNet for training of the model.',
      tags: ['PyTorch', 'YOLO', 'CNN', 'DenseNet', 'Machine learning'],
      link: null,
      buttonLabel: null
    },
    {
      title: 'Covid-19 Tracker',
      category: 'Web Application',
      date: 'Jun 2021 – Dec 2021',
      image: 'assets/covid_tracker.png',
      description: 'Developed an interactive Covid-19 hotspot tracking web application with live case data visualization using Folium maps and Django. Enabled location-based hotspot detection and real-time data updates to help users stay informed during the pandemic.',
      tags: ['Django', 'Python', 'Folium', 'Data Viz'],
      link: null,
      buttonLabel: null
    }
  ];

  certifications = [
    {
      title: 'Smart India Hackathon Finalist',
      issuer: 'Ministry of Education, India',
      date: 'Aug 2022',
      link: 'https://drive.google.com/file/d/1rep4XwLAc0HXHqXVMGrxIdphP9-vRR-m/view?usp=sharing',
      logo: 'assets/SIH2.webp'
    },
    {
      title: 'Developing Applications with Apache Spark™',
      issuer: 'Databricks',
      date: 'Jun 2026',
      link: 'https://drive.google.com/file/d/1td3uZgAych_iDe8J1Rlp7-Aztp3zMQ7H/view',
      logo: 'assets/databricks_logo.jpg'
    },
    {
      title: 'Digital Marketing',
      issuer: 'Google',
      date: 'Mar 2023',
      link: 'https://drive.google.com/file/d/12QA-_6O1Ra2CR9buRuS-zGfPbeZpp0uy/view',
      logo: 'assets/google_logo.jpg'
    },
    {
      title: 'Entrepreneurial Management',
      issuer: 'Great Learning',
      date: 'Dec 2025',
      link: 'https://www.mygreatlearning.com/certificate/XFCTJCOC',
      logo: 'assets/great_learning_academy_logo.jpg'
    },
    {
      title: 'Programming for Everybody',
      issuer: 'University of Michigan',
      date: 'Nov 2020',
      link: 'https://drive.google.com/file/d/1cEcmhgIB87Rh1WTfJxJi7PnK2xulCmxk/view',
      logo: 'assets/michigan.jpg'
    },
    {
      title: 'Python for Machine Learning',
      issuer: 'Great Learning',
      date: 'Nov 2021',
      link: 'https://drive.google.com/file/d/1uH2L4SyAvh3TIC-lvHSBghaA0WIKDdXX/view',
      logo: 'assets/great_learning_academy_logo.jpg'
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
