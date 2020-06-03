interface Player {
  id: string;
  username: string;
  name: string;
  machinesPlayed: Machine[];
  scores: Score[];
  locationsVisited: Location[];
  email: string;
}

interface Score {
  id: string;
  score: string;
  machine: Machine;
  date: string;
}

interface ScoreInput {
  id: string;
  score: string;
  machine: Machine;
  date: string;
}

interface Machine {
  id: number;
  name: string;
  is_active: string;
  created_at: string;
  updated_at: string;
  ipdb_link: string;
  year: number;
  manufacturer: string;
  machine_group_id: number;
  ipdb_id: number;
  opdb_id: string;
}
