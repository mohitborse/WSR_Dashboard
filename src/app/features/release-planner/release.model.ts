export type ReleaseEnvironment = string;
export type ReleasePod = string;
export type ReleaseStatus = string;

export interface ReleaseOptions {
  environments: string[];
  pods: string[];
  statuses: string[];
}

export interface Release {
  id: string;
  title: string;
  description: string | null;
  environment: ReleaseEnvironment;
  pod: ReleasePod;
  scheduled_date: string;
  scheduled_time: string;
  status: ReleaseStatus;
  created_at: string;
  updated_at: string;
}

export type ReleaseInput = Pick<
  Release,
  'title' | 'description' | 'environment' | 'pod' | 'scheduled_date' | 'scheduled_time' | 'status'
>;