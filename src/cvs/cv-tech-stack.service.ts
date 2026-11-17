import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TechStack } from '../tech-stacks/entities/tech-stack.entity.js';
import { ApplicantTechStack } from '../applicant-tech-stacks/entities/applicant-tech-stack.entity.js';
import { normalizeTechStack } from './cv-helpers.js';

@Injectable()
export class CvTechStackService {
  constructor(
    @InjectModel(TechStack.name)
    private readonly techStackModel: Model<TechStack>,
    @InjectModel(ApplicantTechStack.name)
    private readonly applicantTechStackModel: Model<ApplicantTechStack>,
  ) {}

  async getNamesForPosition(positionId: Types.ObjectId) {
    const techStacks = await this.techStackModel
      .find({ position: positionId, deletedAt: null })
      .select('name')
      .lean()
      .exec();

    const names: string[] = [];
    for (const techStack of techStacks) {
      names.push(techStack.name);
    }
    return names;
  }

  async matchNames(names: string[], positionId?: Types.ObjectId) {
    let techStacks;
    if (positionId) {
      techStacks = await this.techStackModel
        .find({ position: positionId, deletedAt: null })
        .select('name')
        .lean()
        .exec();
    } else {
      techStacks = await this.techStackModel
        .find({ deletedAt: null })
        .select('name')
        .lean()
        .exec();
    }

    const normalizedNames = new Set<string>();
    for (const name of names) {
      normalizedNames.add(normalizeTechStack(name));
    }

    const matchedNames: string[] = [];
    for (const techStack of techStacks) {
      const normalizedName = normalizeTechStack(techStack.name);
      if (normalizedNames.has(normalizedName)) {
        matchedNames.push(techStack.name);
      }
    }
    return matchedNames;
  }

  async findMatchesForPosition(names: string[], positionId: Types.ObjectId) {
    const techStacks = await this.techStackModel
      .find({ position: positionId, deletedAt: null })
      .select('_id name')
      .exec();

    const normalizedNames = new Set<string>();
    for (const name of names) {
      normalizedNames.add(normalizeTechStack(name));
    }

    return techStacks.filter((techStack) => {
      return normalizedNames.has(normalizeTechStack(techStack.name));
    });
  }

  async syncApplicant(
    applicantId: Types.ObjectId,
    techStackIds: Types.ObjectId[],
  ) {
    await this.applicantTechStackModel.updateMany(
      { applicant: applicantId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );

    for (const techStackId of techStackIds) {
      await this.applicantTechStackModel.updateOne(
        { applicant: applicantId, tech_stack: techStackId },
        {
          $set: { deletedAt: null },
          $setOnInsert: {
            applicant: applicantId,
            tech_stack: techStackId,
          },
        },
        { upsert: true },
      );
    }
  }
}
