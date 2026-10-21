import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { NumberStepperComponent } from '../../shared/number-stepper.component';
import { ProgressBarComponent } from '../../shared/progress-bar.component';
import { AuthService } from '../../core/auth.service';
import { Developer, Sprint, SubTeam, Team, WsrReportView, availableCapacity, storyDeliveryPct, storyPointDeliveryPct, utilizationPct, deliveryStatus, utilizationStatus } from '../../core/models';
import { TeamsService } from '../../core/services/teams.service';
import { DevelopersService } from '../../core/services/developers.service';
import { SprintsService } from '../../core/services/sprints.service';
import { WsrService } from '../../core/services/wsr.service';
import { crossFieldWarnings, validateWsrForm } from '../../core/wsr-validation';

@Component({
  selector: 'app-data-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumberStepperComponent, ProgressBarComponent],
  templateUrl: './data-entry.component.html',
})
export class DataEntryComponent implements OnInit {
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  fieldErrors = signal<Record<string, string>>({});
  warnings = signal<{ field: string; message: string }[]>([]);
  overrideWarnings = signal(false);

  existingId = signal<string | null>(null);
  newLeaveDate = signal('');

  sprints = signal<Sprint[]>([]);
  teams = signal<Team[]>([]);
  subTeams = signal<SubTeam[]>([]);
  developers = signal<Developer[]>([]);
  existingReports = signal<WsrReportView[]>([]);
  // computed week boundaries (ISO date strings)
  week1Start = signal<string | null>(null);
  week1End = signal<string | null>(null);
  week2Start = signal<string | null>(null);
  week2End = signal<string | null>(null);

  form = this.fb.group({
    sprint_id: ['', Validators.required],
    week_number: [1, [Validators.required, Validators.min(1), Validators.max(2)]],
    team_id: ['', Validators.required],
    sub_team_id: [''],
    developer_id: ['', Validators.required],

    sprint_capacity: [40, [Validators.required, Validators.min(0)]],
    reported_hours: [0, [Validators.required, Validators.min(0)]],
    leave_hours: [0, [Validators.required, Validators.min(0)]],
    leave_dates: this.fb.control<string[]>([]),

    stories_planned: [0, [Validators.required, Validators.min(0)]],
    stories_delivered: [0, [Validators.required, Validators.min(0)]],
    story_points_planned: [0, [Validators.required, Validators.min(0)]],
    story_points_delivered: [0, [Validators.required, Validators.min(0)]],

    qa_defects: [0, [Validators.required, Validators.min(0)]],
    uat_defects: [0, [Validators.required, Validators.min(0)]],

    highlights: [''],
    blockers: [''],
    comments: [''],
  });

  // ---- derived / filtered lists -------------------------------------------------
  filteredSubTeams = computed(() => {
    const teamId = this.formValues().team_id;
    return this.subTeams().filter((st) => st.team_id === teamId);
  });

  filteredDevelopers = computed(() => {
    const { team_id, sub_team_id } = this.formValues();
    return this.developers().filter((d) => {
      if (team_id && d.team_id !== team_id) return false;
      if (sub_team_id && d.sub_team_id !== sub_team_id) return false;
      return true;
    });
  });

  // ---- live calculations ---------------------------------------------------------
  private formValuesSignal = signal(this.form.getRawValue());
  formValues = this.formValuesSignal.asReadonly();

  calc = computed(() => {
    const v = this.formValues();
    const avail = availableCapacity(v.sprint_capacity ?? 0, v.leave_hours ?? 0);
    const util = utilizationPct(v.reported_hours ?? 0, v.sprint_capacity ?? 0, v.leave_hours ?? 0);
    const storyPct = storyDeliveryPct(v.stories_delivered ?? 0, v.stories_planned ?? 0);
    const pointPct = storyPointDeliveryPct(v.story_points_delivered ?? 0, v.story_points_planned ?? 0);
    return {
      availableCapacity: avail,
      utilizationPct: util,
      utilizationLevel: utilizationStatus(util),
      storyDeliveryPct: storyPct,
      storyDeliveryLevel: deliveryStatus(storyPct),
      storyPointDeliveryPct: pointPct,
      storyPointDeliveryLevel: deliveryStatus(pointPct),
    };
  });

  constructor(
    private router: Router,
    private injectedRoute: ActivatedRoute,
    public auth: AuthService,
    private teamsSvc: TeamsService,
    private devSvc: DevelopersService,
    private sprintsSvc: SprintsService,
    private wsrSvc: WsrService
  ) {
    this.form.valueChanges.subscribe(() => this.formValuesSignal.set(this.form.getRawValue()));
    console.log('auth session', this.auth.session()?.user);

  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const [sprints, teams, subTeams, developers] = await Promise.all([
      this.sprintsSvc.getSprints(),
      this.teamsSvc.getTeams(true),
      this.teamsSvc.getSubTeams(undefined, true),
      this.devSvc.getDevelopers({ activeOnly: true }),
    ]);
    this.sprints.set(sprints);
    this.teams.set(teams);
    this.subTeams.set(subTeams);
    this.developers.set(developers);
    this.loading.set(false);

    // Reset sub-team/developer whenever the team changes.
    this.form.controls.team_id.valueChanges.subscribe(() => {
      this.form.patchValue({ sub_team_id: '', developer_id: '' }, { emitEvent: true });
    });
    this.form.controls.sub_team_id.valueChanges.subscribe(() => {
      this.form.patchValue({ developer_id: '' }, { emitEvent: true });
    });

    // When sprint changes compute week boundaries and auto-select the week
    this.form.controls.sprint_id.valueChanges.subscribe((sprintId) => {
      const sprint = this.sprints().find((s) => s.id === sprintId);
      if (sprint) {
        this.computeWeekBoundaries(sprint.start_date);
        // auto-select week based on today's date
        const todayIso = new Date().toISOString();
        const wk = this.weekNumberForDate(todayIso, sprint.start_date);
        // only update if different to avoid refire of valueChanges unnecessarily
        if (this.form.controls.week_number.value !== wk) {
          this.form.patchValue({ week_number: wk }, { emitEvent: true });
        }
      } else {
        this.week1Start.set(null);
        this.week1End.set(null);
        this.week2Start.set(null);
        this.week2End.set(null);
      }
    });

    // When developer changes, prefill their default capacity.
    this.form.controls.developer_id.valueChanges.subscribe((devId) => {
      const dev = this.developers().find((d) => d.id === devId);
      if (dev && !this.existingId()) {
        this.form.patchValue({ sprint_capacity: dev.default_sprint_capacity }, { emitEvent: true });
      }
    });

    // When developer + sprint are both chosen, load existing reports and prefill weekly record.
    this.form.valueChanges.subscribe(async () => {
      const { developer_id, sprint_id, week_number } = this.form.getRawValue();
      if (developer_id && sprint_id) {
        // load both the list and the week-specific entry
        this.loadExistingReports(developer_id, sprint_id).catch(() => {});
        await this.tryLoadExisting(developer_id, sprint_id, week_number ?? 1);
      } else {
        this.existingReports.set([]);
      }
    });

    // If the route contains query params, prefill the form (useful when
    // navigating from the WSR list). Accept developer_id, sprint_id, week_number.
    const qp = this.injectedRoute.snapshot.queryParams as Record<string, any>;
    if (qp['developer_id'] || qp['sprint_id'] || qp['week_number']) {
      this.form.patchValue(
        {
          developer_id: qp['developer_id'] ?? this.form.controls.developer_id.value,
          sprint_id: qp['sprint_id'] ?? this.form.controls.sprint_id.value,
          week_number: qp['week_number'] ? Number(qp['week_number']) : this.form.controls.week_number.value,
        },
        { emitEvent: true }
      );
    }
  }

  private lastLookupKey = '';
  private async tryLoadExisting(developerId: string, sprintId: string, weekNumber = 1): Promise<void> {
    const key = `${developerId}:${sprintId}:${weekNumber}`;
    if (key === this.lastLookupKey) return;
    this.lastLookupKey = key;

    const existing = await this.wsrSvc.findExisting(developerId, sprintId, weekNumber);
    if (existing) {
      this.existingId.set(existing.id);
      this.form.patchValue(
        {
          team_id: existing.team_id,
          sub_team_id: existing.sub_team_id ?? '',
          sprint_capacity: existing.sprint_capacity,
          reported_hours: existing.reported_hours,
          leave_hours: existing.leave_hours,
          leave_dates: existing.leave_dates ?? [],
          stories_planned: existing.stories_planned,
          stories_delivered: existing.stories_delivered,
          story_points_planned: existing.story_points_planned,
          story_points_delivered: existing.story_points_delivered,
          qa_defects: existing.qa_defects,
          uat_defects: existing.uat_defects,
          highlights: existing.highlights ?? '',
          blockers: existing.blockers ?? '',
          comments: existing.comments ?? '',
        },
        { emitEvent: false }
      );
      // Ensure derived formValues are updated so UI indicators (calc()) refresh immediately
      this.formValuesSignal.set(this.form.getRawValue());
    } else {
      this.existingId.set(null);
    }
  }

  // Load list of existing reports for the selected developer + sprint
  async loadExistingReports(developerId: string, sprintId: string): Promise<void> {
    try {
      console.debug('Loading existing WSRs for', { developerId, sprintId });
      const rows = await this.wsrSvc.getWsrReports({ developerId, sprintId });
      console.debug('Loaded rows', rows);
      this.existingReports.set(rows);
    } catch (e: any) {
      console.error('Failed loading existing WSRs', e);
      this.existingReports.set([]);
    }
  }

  // Load a specific report by id into the form for editing
  async loadReportById(id: string): Promise<void> {
    try {
      console.debug('Loading report by id', id);
      const row = await this.wsrSvc.getWsrReport(id);
      if (!row) return;
      this.existingId.set(row.id);
      // Patch form directly from the loaded row so Edit works immediately
      this.form.patchValue(
        {
          sprint_id: row.sprint_id,
          developer_id: row.developer_id,
          team_id: row.team_id,
          sub_team_id: row.sub_team_id ?? '',
          week_number: (row as any).week_number ?? 1,
          sprint_capacity: row.sprint_capacity ?? 40,
          reported_hours: row.reported_hours ?? 0,
          leave_hours: row.leave_hours ?? 0,
          leave_dates: row.leave_dates ?? [],
          stories_planned: row.stories_planned ?? 0,
          stories_delivered: row.stories_delivered ?? 0,
          story_points_planned: row.story_points_planned ?? 0,
          story_points_delivered: row.story_points_delivered ?? 0,
          qa_defects: row.qa_defects ?? 0,
          uat_defects: row.uat_defects ?? 0,
          highlights: row.highlights ?? '',
          blockers: row.blockers ?? '',
          comments: row.comments ?? '',
        },
        { emitEvent: false }
      );
      // Update derived values so indicators map in edit mode
      this.formValuesSignal.set(this.form.getRawValue());
      // Refresh the left panel list for the same sprint/developer
      await this.loadExistingReports(row.developer_id, row.sprint_id);
    } catch (e) {
      console.error('Failed to load report by id', e);
    }
  }

  // Small helper to log rows from the template (avoids using global `console` in template)
  debugLog(row: unknown): void {
    // keep this method minimal and side-effect free
    // eslint-disable-next-line no-console
    console.log(row);
  }

  // -------- week helpers ------------------------------------------------------
  private isWeekend(d: Date): boolean {
    const wd = d.getDay();
    return wd === 0 || wd === 6;
  }

  private addWorkingDaysInclusive(startIso: string, days: number): Date {
    const d = new Date(startIso);
    // treat start day as first working day if it's not weekend
    let count = this.isWeekend(d) ? 0 : 1;
    while (count < days) {
      d.setDate(d.getDate() + 1);
      if (!this.isWeekend(d)) count++;
    }
    return d;
  }

  computeWeekBoundaries(sprintStartIso: string) {
    try {
      const start = new Date(sprintStartIso);
      // Week 1: first 5 working days including start
      const w1Start = start;
      const w1End = this.addWorkingDaysInclusive(sprintStartIso, 5);
      // Week 2 starts after w1End: find next working day
      const tmp = new Date(w1End);
      tmp.setDate(tmp.getDate() + 1);
      while (this.isWeekend(tmp)) tmp.setDate(tmp.getDate() + 1);
      const w2Start = tmp;
      const w2End = this.addWorkingDaysInclusive(w2Start.toISOString(), 5);

      this.week1Start.set(w1Start.toISOString().slice(0, 10));
      this.week1End.set(w1End.toISOString().slice(0, 10));
      this.week2Start.set(w2Start.toISOString().slice(0, 10));
      this.week2End.set(w2End.toISOString().slice(0, 10));
    } catch (e) {
      this.week1Start.set(null);
      this.week1End.set(null);
      this.week2Start.set(null);
      this.week2End.set(null);
    }
  }

  weekNumberForDate(dateIso: string, sprintStartIso: string): number {
    try {
      const d = new Date(dateIso);
      const w1End = new Date(this.addWorkingDaysInclusive(sprintStartIso, 5).toISOString());
      const w2End = new Date(this.addWorkingDaysInclusive(w1End.toISOString(), 5).toISOString());
      if (d <= w1End) return 1;
      return 2;
    } catch (e) {
      return 1;
    }
  }

  // ---- leave dates -----------------------------------------------------------------
  addLeaveDate(): void {
    const date = this.newLeaveDate();
    if (!date) return;
    const current = this.form.controls.leave_dates.value ?? [];
    if (!current.includes(date)) {
      this.form.controls.leave_dates.setValue([...current, date].sort());
    }
    this.newLeaveDate.set('');
  }

  removeLeaveDate(date: string): void {
    const current = this.form.controls.leave_dates.value ?? [];
    this.form.controls.leave_dates.setValue(current.filter((d) => d !== date));
  }

  // ---- actions ---------------------------------------------------------------------
  teamName(id: string | null): string {
    return this.teams().find((t) => t.id === id)?.name ?? '';
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  resetForm(): void {
    this.form.reset({
      sprint_id: '',
      week_number: 1,
      team_id: '',
      sub_team_id: '',
      developer_id: '',
      sprint_capacity: 40,
      reported_hours: 0,
      leave_hours: 0,
      leave_dates: [],
      stories_planned: 0,
      stories_delivered: 0,
      story_points_planned: 0,
      story_points_delivered: 0,
      qa_defects: 0,
      uat_defects: 0,
      highlights: '',
      blockers: '',
      comments: '',
    });
    this.existingId.set(null);
    this.lastLookupKey = '';
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.fieldErrors.set({});
    this.warnings.set([]);
  }

  async saveDraft(): Promise<void> {
    await this.save('Draft');
  }

  async submit(): Promise<void> {
    await this.save('Submitted');
  }

  private async save(status: 'Draft' | 'Submitted'): Promise<void> {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.fieldErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Please fill in all required fields.');
      return;
    }

    const raw = this.form.getRawValue();
    const validated = validateWsrForm(raw);
    if (!validated.success) {
      this.fieldErrors.set(validated.errors);
      this.errorMsg.set('Please correct the highlighted fields.');
      return;
    }

    const warnings = crossFieldWarnings(validated.data);
    this.warnings.set(warnings);

    // Non-admins cannot override validation warnings on Submit (Draft is always allowed).
    if (warnings.length > 0 && status === 'Submitted' && !(this.auth.isAdmin() && this.overrideWarnings())) {
      this.errorMsg.set(
        this.auth.isAdmin()
          ? 'Please check "Override validation warnings" to submit despite the warnings below.'
          : 'Please resolve the warnings below before submitting, or ask an Admin to override.'
      );
      return;
    }

    this.saving.set(true);
    try {
      await this.wsrSvc.upsert({
        id: this.existingId() ?? undefined,
        sprint_id: raw.sprint_id!,
          week_number: raw.week_number!,
        developer_id: raw.developer_id!,
        team_id: raw.team_id!,
        sub_team_id: raw.sub_team_id || null,
        sprint_capacity: raw.sprint_capacity!,
        reported_hours: raw.reported_hours!,
        leave_hours: raw.leave_hours!,
        leave_dates: raw.leave_dates ?? [],
        stories_planned: raw.stories_planned!,
        stories_delivered: raw.stories_delivered!,
        story_points_planned: raw.story_points_planned!,
        story_points_delivered: raw.story_points_delivered!,
        qa_defects: raw.qa_defects!,
        uat_defects: raw.uat_defects!,
        highlights: raw.highlights || null,
        blockers: raw.blockers || null,
        comments: raw.comments || null,
        status,
        created_by: this.auth.profile()?.id ?? null,
      });

      this.successMsg.set(status === 'Draft' ? 'Draft saved.' : 'WSR submitted successfully.');
      this.lastLookupKey = '';
      await this.tryLoadExisting(raw.developer_id!, raw.sprint_id!, raw.week_number ?? 1);
      await this.loadExistingReports(raw.developer_id!, raw.sprint_id!);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to save WSR report.');
    } finally {
      this.saving.set(false);
    }
  }
}
