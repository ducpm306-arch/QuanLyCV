import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Position } from '../positions/entities/position.entity.js';
import { escapeRegex, positionTerms } from './cv-helpers.js';

@Injectable()
export class CvPositionService {
  constructor(
    @InjectModel(Position.name)
    private readonly positionModel: Model<Position>,
  ) {}

  findById(id: string) {
    return this.positionModel.findOne({ _id: id, deletedAt: null });
  }

  async findForApproval(positionId?: string, extractedName?: string | null) {
    if (positionId) {
      return this.positionModel.findOne({
        _id: positionId,
        deletedAt: null,
      });
    }

    if (!extractedName) {
      return null;
    }

    const name = escapeRegex(extractedName);
    return this.positionModel.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      deletedAt: null,
    });
  }

  async findClosest(positionName: string | null) {
    if (!positionName || !positionName.trim()) {
      return null;
    }

    const positions = await this.positionModel
      .find({ deletedAt: null })
      .select('_id name')
      .lean()
      .exec();
    const queryTerms = positionTerms(positionName);
    if (queryTerms.size === 0) {
      return null;
    }

    let bestPosition: (typeof positions)[number] | null = null;
    let bestScore = 0;
    let ambiguous = false;

    for (const position of positions) {
      const candidateTerms = positionTerms(position.name);
      let numberOfMatchingTerms = 0;

      for (const term of queryTerms) {
        if (candidateTerms.has(term)) {
          numberOfMatchingTerms += 1;
        }
      }

      const score = numberOfMatchingTerms / queryTerms.size;
      if (score > bestScore) {
        bestPosition = position;
        bestScore = score;
        ambiguous = false;
      } else if (score > 0 && score === bestScore) {
        ambiguous = true;
      }
    }

    if (bestScore >= 0.5 && !ambiguous) {
      return bestPosition;
    }
    return null;
  }
}
