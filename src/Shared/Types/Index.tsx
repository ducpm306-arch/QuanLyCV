export interface CV {
  id: string;
  createAt: Date;
  name: string;
  jobApplication: string;
  yearsExperience: number;
  email: string;
  phoneNumber: number;
  techStack: string;
  note: string;
  keyWords: string;
  status: boolean;
}

export interface CVFile {
  id: string;
  createAt: Date;
  name: string;
  fileSize: number;
  candidateId: string;
}
