import 'reflect-metadata';
import mongoose from 'mongoose';
import {
  Position,
  PositionSchema,
} from '../positions/entities/position.entity.js';
import {
  TechStack,
  TechStackSchema,
} from '../tech-stacks/entities/tech-stack.entity.js';
import { defaultPositions } from './seed-data.js';

async function seed() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('Chưa cấu hình MONGO_URL trong file .env');
  }

  await mongoose.connect(mongoUrl);

  const PositionModel = mongoose.model(Position.name, PositionSchema);
  const TechStackModel = mongoose.model(TechStack.name, TechStackSchema);

  let createdPositions = 0;
  let createdTechStacks = 0;

  for (const data of defaultPositions) {
    let position = await PositionModel.findOne({ name: data.name });

    if (!position) {
      position = await PositionModel.create({
        name: data.name,
        description: data.description,
        requiredSkills: data.requiredSkills,
        preferredSkills: data.preferredSkills,
        minExperienceYears: data.minExperienceYears,
        educationRequirements: data.educationRequirements,
      });
      createdPositions += 1;
    }

    for (const name of data.techStacks) {
      const existingTechStack = await TechStackModel.findOne({
        name,
        position: position._id,
      });

      if (!existingTechStack) {
        await TechStackModel.create({
          name,
          position: position._id,
        });
        createdTechStacks += 1;
      }
    }
  }

  console.log(
    `Seed hoàn tất: thêm ${createdPositions} position và ${createdTechStacks} tech stack.`,
  );
}

try {
  await seed();
} catch (error) {
  console.error('Không thể seed dữ liệu:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
