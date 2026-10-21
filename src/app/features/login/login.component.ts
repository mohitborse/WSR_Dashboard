import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);

  mode = signal<'login' | 'forgot'>('login');
  submitting = signal(false);
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(private auth: AuthService, private router: Router) {}

  switchMode(mode: 'login' | 'forgot'): void {
    this.mode.set(mode);
    this.errorMsg.set(null);
    this.infoMsg.set(null);
  }

  async submitLogin(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMsg.set(null);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    const { error } = await this.auth.login(email!, password!);
    this.submitting.set(false);

    if (error) {
      this.errorMsg.set(error);
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  async submitForgot(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    this.submitting.set(true);
    const { email } = this.forgotForm.getRawValue();
    const { error } = await this.auth.forgotPassword(email!);
    this.submitting.set(false);

    if (error) {
      this.errorMsg.set(error);
      return;
    }
    this.infoMsg.set('If that email is registered, a reset link has been sent.');
  }
}
