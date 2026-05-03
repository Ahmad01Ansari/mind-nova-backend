import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface ScoreInputVector {
  emotional: number;
  cognitive: number;
  behavioral: number;
  physiological: number;
  temporal: number;
}

export interface DynamicWeights {
  wE: number;
  wC: number;
  wB: number;
  wP: number;
  wT: number;
}

@Injectable()
export class ScoringEngineService {
  private readonly logger = new Logger(ScoringEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the full dimensional profile and saves it
   */
  async calculateAndSaveScore(userId: string, input: ScoreInputVector, isCrisisFlagged: boolean = false) {
    const weights = this.applyDynamicWeighting(input);
    
    // 1. Calculate CMHI
    const cmhi = 
      (input.emotional * weights.wE) + 
      (input.cognitive * weights.wC) + 
      (input.behavioral * weights.wB) + 
      (input.physiological * weights.wP) + 
      (input.temporal * weights.wT);

    // 2. Calculate Sub-Indices
    const anxietyRisk = (input.emotional * 0.4) + (input.cognitive * 0.3) + (input.physiological * 0.3);
    const depressionRisk = (input.emotional * 0.4) + (input.behavioral * 0.4) + (input.physiological * 0.2);
    const burnoutRisk = (input.cognitive * 0.3) + (input.physiological * 0.4) + (input.temporal * 0.3);
    
    const crisisMultiplier = isCrisisFlagged ? 100 : 0;
    const crisisRisk = (input.emotional * 0.4) + (input.temporal * 0.4) + (crisisMultiplier * 0.2);

    // 3. Determine Risk Category
    let category = 'MINIMAL';
    if (cmhi > 20) category = 'MILD';
    if (cmhi > 40) category = 'MODERATE';
    if (cmhi > 60) category = 'HIGH';
    if (cmhi > 80) category = 'SEVERE';
    if (crisisRisk > 80 || isCrisisFlagged) category = 'EMERGENCY';

    // 4. Save to PostgreSQL
    const record = await this.prisma.multiDimensionalScore.create({
      data: {
        userId,
        cmhi,
        emotional: input.emotional,
        cognitive: input.cognitive,
        behavioral: input.behavioral,
        physiological: input.physiological,
        temporal: input.temporal,
        anxietyRisk,
        depressionRisk,
        burnoutRisk,
        crisisRisk,
        riskCategory: category,
      }
    });

    this.logger.log(`Generated CMHI ${cmhi.toFixed(1)} [${category}] for user ${userId}`);
    return record;
  }

  /**
   * Adjusts the standard baseline weights based on critical acute factors
   */
  private applyDynamicWeighting(input: ScoreInputVector): DynamicWeights {
    let wE = 0.25;
    let wC = 0.20;
    let wB = 0.20;
    let wP = 0.20;
    let wT = 0.15;

    let adjustmentNeeded = false;

    // Trigger 1: Sleep Crisis (Physiological dominates)
    if (input.physiological > 80) {
      wP = 0.40;
      adjustmentNeeded = true;
    }

    // Trigger 2: Rumination Loop
    if (input.cognitive > 80) {
      wC = 0.35;
      adjustmentNeeded = true;
    }

    // Trigger 3: Sudden Crash
    if (input.temporal > 75) {
      wT = 0.30;
      adjustmentNeeded = true;
    }

    if (adjustmentNeeded) {
      // Very simple normalization fallback to ensure sum == 1.0 
      // For production we use a rigid proportional scale.
      const sum = wE + wC + wB + wP + wT;
      wE = wE / sum;
      wC = wC / sum;
      wB = wB / sum;
      wP = wP / sum;
      wT = wT / sum;
    }

    return { wE, wC, wB, wP, wT };
  }
}
