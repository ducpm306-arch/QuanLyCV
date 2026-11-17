export type PositionSeed = {
  name: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears: number;
  educationRequirements: string;
  techStacks: string[];
};

export const defaultPositions: PositionSeed[] = [
  {
    name: 'Backend Developer',
    description:
      'Phát triển và bảo trì API, dịch vụ và cơ sở dữ liệu phía server.',
    requiredSkills: ['REST API', 'Git', 'Database'],
    preferredSkills: ['Docker', 'Unit Test'],
    minExperienceYears: 1,
    educationRequirements: 'Công nghệ thông tin hoặc ngành liên quan',
    techStacks: [
      'Node.js',
      'NestJS',
      'ExpressJS',
      'Java',
      'Spring Boot',
      'MongoDB',
      'PostgreSQL',
      'MySQL',
      'Redis',
    ],
  },
  {
    name: 'Frontend Developer',
    description: 'Xây dựng giao diện web và tích hợp giao diện với API.',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'Git'],
    preferredSkills: ['Responsive Design', 'UI/UX'],
    minExperienceYears: 1,
    educationRequirements: 'Công nghệ thông tin hoặc ngành liên quan',
    techStacks: [
      'React',
      'Vue.js',
      'Angular',
      'TypeScript',
      'Bootstrap',
      'Tailwind CSS',
    ],
  },
  {
    name: 'Fullstack Developer',
    description: 'Phát triển tính năng hoàn chỉnh ở cả frontend và backend.',
    requiredSkills: ['JavaScript', 'REST API', 'Git', 'Database'],
    preferredSkills: ['Docker', 'CI/CD'],
    minExperienceYears: 1,
    educationRequirements: 'Công nghệ thông tin hoặc ngành liên quan',
    techStacks: [
      'React',
      'TypeScript',
      'Node.js',
      'NestJS',
      'MongoDB',
      'PostgreSQL',
    ],
  },
  {
    name: 'Mobile Developer',
    description: 'Phát triển và bảo trì ứng dụng trên thiết bị di động.',
    requiredSkills: ['Mobile Development', 'REST API', 'Git'],
    preferredSkills: ['App Store', 'Push Notification'],
    minExperienceYears: 1,
    educationRequirements: 'Công nghệ thông tin hoặc ngành liên quan',
    techStacks: ['Flutter', 'Dart', 'React Native', 'Kotlin', 'Swift'],
  },
  {
    name: 'QA Engineer',
    description: 'Phân tích yêu cầu, thiết kế và thực hiện kiểm thử phần mềm.',
    requiredSkills: ['Manual Testing', 'Test Case', 'Bug Tracking'],
    preferredSkills: ['Automation Testing', 'API Testing'],
    minExperienceYears: 1,
    educationRequirements: 'Công nghệ thông tin hoặc ngành liên quan',
    techStacks: ['Selenium', 'Cypress', 'Playwright', 'Postman', 'JMeter'],
  },
  {
    name: 'DevOps Engineer',
    description: 'Xây dựng quy trình triển khai và vận hành hệ thống.',
    requiredSkills: ['Linux', 'Git', 'CI/CD'],
    preferredSkills: ['Cloud', 'Monitoring'],
    minExperienceYears: 1,
    educationRequirements: 'Công nghệ thông tin hoặc ngành liên quan',
    techStacks: [
      'Docker',
      'Kubernetes',
      'Jenkins',
      'GitLab CI',
      'AWS',
      'Azure',
      'Terraform',
    ],
  },
  {
    name: 'Data Engineer',
    description: 'Xây dựng pipeline và hệ thống lưu trữ, xử lý dữ liệu.',
    requiredSkills: ['SQL', 'Data Pipeline', 'Git'],
    preferredSkills: ['Cloud', 'Data Warehouse'],
    minExperienceYears: 1,
    educationRequirements:
      'Công nghệ thông tin, Khoa học dữ liệu hoặc ngành liên quan',
    techStacks: [
      'Python',
      'Apache Spark',
      'Apache Kafka',
      'Airflow',
      'PostgreSQL',
      'BigQuery',
    ],
  },
];
