import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-number-stepper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-stretch rounded-md border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
      <button
        type="button"
        class="px-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-medium"
        (click)="step(-1)"
        [disabled]="disabled"
      >
        −
      </button>
      <input
        type="number"
        class="w-full text-sm text-center px-1 py-2 outline-none disabled:bg-slate-100 disabled:text-slate-400"
        [min]="min"
        [step]="step_"
        [ngModel]="value"
        (ngModelChange)="onInput($event)"
        [disabled]="disabled"
      />
      <button
        type="button"
        class="px-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-medium"
        (click)="step(1)"
        [disabled]="disabled"
      >
        +
      </button>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberStepperComponent),
      multi: true,
    },
  ],
})
export class NumberStepperComponent implements ControlValueAccessor {
  @Input() min = 0;
  @Input() step_ = 1;

  value = 0;
  disabled = false;

  private onChange: (v: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number): void {
    this.value = value ?? 0;
  }
  registerOnChange(fn: (v: number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(v: number | string): void {
    let n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n)) n = 0;
    if (n < this.min) n = this.min;
    this.value = n;
    this.onChange(n);
    this.onTouched();
  }

  step(delta: number): void {
    if (this.disabled) return;
    this.onInput((this.value || 0) + delta * this.step_);
  }
}
