import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleaseCalendarComponent } from './release-calendar.component';
import { ReleaseSidebarComponent } from './release-sidebar.component';

describe('Release Planner UI', () => {
  it('renders all month navigation icons without runtime errors', () => {
    const fixture: ComponentFixture<ReleaseCalendarComponent> = TestBed.createComponent(ReleaseCalendarComponent);
    fixture.componentRef.setInput('currentMonth', new Date(2026, 10, 1));
    fixture.componentRef.setInput('selectedDate', '2026-11-02');
    fixture.componentRef.setInput('releases', []);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelectorAll('.month-navigation svg').length).toBe(3);
  });

  it('renders the sidebar summary footer', () => {
    const fixture: ComponentFixture<ReleaseSidebarComponent> = TestBed.createComponent(ReleaseSidebarComponent);
    fixture.componentRef.setInput('selectedDate', '2026-11-02');
    fixture.componentRef.setInput('releases', []);
    fixture.componentRef.setInput('summary', { total: 10, ppd: 7, prod: 3 });

    fixture.detectChanges();

    const footerText = fixture.nativeElement.querySelector('footer').textContent;
    expect(footerText).toContain('10');
    expect(footerText).toContain('Total');
    expect(footerText).toContain('PPD');
    expect(footerText).toContain('Prod');
  });
});