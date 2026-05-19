import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class ContactComponent implements OnInit {
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
}
