export interface User {
  id: number;
  garminEmail: string;
  firstName: string | null;
  lastName: string | null;
  profilePhoto: string | null;
  garminPassword: string;
  createdAt: string;
}

export interface Activity {
  id: number;
  userId: number;
  name: string;
  type: string;
  distance: number | null;
  movingTime: number | null;
  elapsedTime: number | null;
  totalElevationGain: number | null;
  averageSpeed: number | null;
  maxSpeed: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  startDate: string;
  startDateLocal: string | null;
  description: string | null;
  syncedAt: string;
}

export interface Goal {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  targetType: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string | null;
  status: string;
  createdAt: string;
}

export interface CoachMessage {
  id: number;
  userId: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface DashboardWidget {
  id: number;
  userId: number;
  title: string;
  type: string;
  metrics: string[];
  aggregation: string;
  groupBy: string;
  activityFilter: string | null;
  width: number;
  order: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  createdAt: string;
}

export interface Database {
  users: User[];
  activities: Activity[];
  goals: Goal[];
  coachMessages: CoachMessage[];
  dashboardWidgets: DashboardWidget[];
  nextIds: {
    users: number;
    goals: number;
    coachMessages: number;
    dashboardWidgets: number;
  };
}
