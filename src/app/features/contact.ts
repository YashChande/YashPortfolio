import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import emailjs from '@emailjs/browser';
import { AnimationService } from '../core/services/animation.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class ContactComponent implements OnInit {
  phoneRevealed = false;
  showToast = false;
  toastMessage = '';
  private toastTimer: any;

  constructor(
    private animService: AnimationService
  ) {}
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  status = {
    submitting: false,
    success: false,
    error: false,
    message: ''
  };

  ngOnInit() {
    emailjs.init('8BsZnzTftlZwoSaWS');
  }

  onSubmit() {
    // Prevent multiple submissions if already sending
    if (this.status.submitting) return;

    this.status.submitting = true;
    this.status.success = false;
    this.status.error = false;
    this.status.message = '';

    const SERVICE_ID = 'service_gw93lpn';
    const TEMPLATE_ID = 'template_oi93amw';

    emailjs.send(SERVICE_ID, TEMPLATE_ID, this.formData)
      .then((response) => {
        this.status.success = true;
        this.status.message = 'Message sent successfully!';
        this.resetForm();
        
        // Clear success message after 5 seconds so they can send another
        setTimeout(() => {
          this.status.success = false;
          this.status.message = '';
        }, 5000);
      })
      .catch((error) => {
        this.status.error = true;
        this.status.message = 'Oops! Failed to send. Please try again.';
        console.error('EmailJS Error:', error);
      })
      .finally(() => {
        this.status.submitting = false;
      });
  }

  resetForm() {
    this.formData = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
  }

  hasBeatenHighScore(): boolean {
    try {
      const score = localStorage.getItem('space_shooter_high_score');
      return score ? parseInt(score, 10) > 2820 : false;
    } catch (e) {
      return false;
    }
  }

  dialPhone() {
    if (this.hasBeatenHighScore()) {
      if (!this.phoneRevealed) {
        this.phoneRevealed = true;
      } else {
        window.location.href = 'tel:+4915510223902';
      }
    }
    // If not beaten, do nothing — the hover popup already explains
  }

  goToGame(event: Event) {
    event.stopPropagation();
    // Scroll with an offset of -100px so it sits perfectly below the sticky header
    this.animService.scrollTo('#space-shooter-card', -100);

    const card = document.getElementById('space-shooter-card');
    if (card) {
      // Activate highlight glow on the card
      card.classList.add('focus-highlight');

      // Clear highlight after 1.5 seconds
      setTimeout(() => {
        card.classList.remove('focus-highlight');
      }, 1500);
    }
  }

  private showToastMessage(msg: string) {
    this.toastMessage = msg;
    this.showToast = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }
}
