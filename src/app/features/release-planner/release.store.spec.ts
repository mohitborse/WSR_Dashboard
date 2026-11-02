import { TestBed } from '@angular/core/testing';
import { Release, ReleaseInput } from './release.model';
import { ReleaseOptionsService } from './release-options.service';
import { ReleaseService } from './release.service';
import { ReleaseStore } from './release.store';

describe('ReleaseStore', () => {
  const ppdRelease: Release = {
    id: 'release-1',
    title: 'PPD release',
    description: null,
    environment: 'PPD',
    pod: 'Panda',
    scheduled_date: '2026-11-03',
    scheduled_time: '09:00:00',
    status: 'Planned',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
  const prodRelease: Release = {
    ...ppdRelease,
    id: 'release-2',
    title: 'Production release',
    environment: 'Prod',
    pod: 'Apollo',
    status: 'Completed',
  };
  let service: jasmine.SpyObj<ReleaseService>;
  let optionsService: jasmine.SpyObj<ReleaseOptionsService>;
  let store: ReleaseStore;

  beforeEach(() => {
    service = jasmine.createSpyObj<ReleaseService>('ReleaseService', ['list', 'create', 'update', 'delete']);
    optionsService = jasmine.createSpyObj<ReleaseOptionsService>('ReleaseOptionsService', ['list']);
    optionsService.list.and.resolveTo({
      environments: ['PPD', 'Prod'],
      pods: ['Panda', 'Avenger', 'Apollo'],
      statuses: ['Planned', 'In Progress', 'Completed'],
    });
    TestBed.configureTestingModule({
      providers: [
        ReleaseStore,
        { provide: ReleaseService, useValue: service },
        { provide: ReleaseOptionsService, useValue: optionsService },
      ],
    });
    store = TestBed.inject(ReleaseStore);
  });

  it('loads releases and clears loading state', async () => {
    service.list.and.resolveTo([ppdRelease, prodRelease]);

    await store.load();

    expect(store.releases()).toEqual([ppdRelease, prodRelease]);
    expect(store.options().pods).toEqual(['Panda', 'Avenger', 'Apollo']);
    expect(store.loading()).toBeFalse();
    expect(store.error()).toBeNull();
  });

  it('computes filtered releases and summary counts', () => {
    store.releases.set([ppdRelease, prodRelease]);
    store.environmentFilter.set('Prod');

    expect(store.filteredReleases()).toEqual([prodRelease]);
    expect(store.summary()).toEqual({ total: 1, ppd: 0, prod: 1 });
  });

  it('computes an unfiltered admin overview and upcoming releases', () => {
    const upcomingRelease: Release = {
      ...ppdRelease,
      scheduled_date: '2099-11-03',
      status: 'In Progress',
      pod: 'Avenger',
    };
    const completedRelease: Release = {
      ...prodRelease,
      scheduled_date: '2099-11-04',
    };
    store.releases.set([upcomingRelease, completedRelease]);
    store.environmentFilter.set('Prod');

    expect(store.adminSummary()).toEqual({
      total: 2,
      environments: { ppd: 1, prod: 1 },
      statuses: { planned: 0, inProgress: 1, completed: 1 },
      pods: { panda: 0, avenger: 1, apollo: 1 },
      upcoming: [upcomingRelease],
    });
  });

  it('creates a release and closes the modal', async () => {
    const input: ReleaseInput = {
      title: ppdRelease.title,
      description: ppdRelease.description,
      environment: ppdRelease.environment,
      pod: ppdRelease.pod,
      scheduled_date: ppdRelease.scheduled_date,
      scheduled_time: ppdRelease.scheduled_time,
      status: ppdRelease.status,
    };
    service.create.and.resolveTo(ppdRelease);
    store.openCreate(ppdRelease.scheduled_date);

    expect(await store.save(input)).toBeTrue();
    expect(store.releases()).toEqual([ppdRelease]);
    expect(store.modalOpen()).toBeFalse();
  });
});