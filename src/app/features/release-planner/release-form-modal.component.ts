import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChevronDown, LucideAngularModule, X } from 'lucide-angular';
import { Release, ReleaseInput, ReleaseOptions } from './release.model';

@Component({
  selector: 'app-release-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './release-form-modal.component.html',
  styleUrl: './release-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleaseFormModalComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly ChevronDown = ChevronDown;
  readonly X = X;
  @Input() release: Release | null = null;
  @Input({ required: true }) options!: ReleaseOptions;
  @Input({ required: true }) defaultDate = '';
  @Input() saving = false;
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<ReleaseInput>();
  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(1000)],
    environment: ['', Validators.required],
    pod: ['', Validators.required],
    scheduled_date: ['', Validators.required],
    scheduled_time: ['09:00', Validators.required],
    status: ['', Validators.required],
  });

  ngOnInit(): void {
    if (this.release) {
      this.form.setValue({
        title: this.release.title,
        description: this.release.description ?? '',
        environment: this.release.environment,
        pod: this.release.pod,
        scheduled_date: this.release.scheduled_date,
        scheduled_time: this.release.scheduled_time.slice(0, 5),
        status: this.release.status,
      });
    } else {
      this.form.controls.environment.setValue(this.options.environments[0] ?? '');
      this.form.controls.pod.setValue(this.options.pods[0] ?? '');
      this.form.controls.status.setValue(this.options.statuses[0] ?? '');
      this.form.controls.scheduled_date.setValue(this.defaultDate);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({ ...value, description: value.description.trim() || null });
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving) this.dismissed.emit();
  }
}