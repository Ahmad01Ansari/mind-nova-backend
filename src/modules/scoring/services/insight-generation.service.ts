import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class InsightGenerationService {
  private readonly logger = new Logger(InsightGenerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateInsight(scoreId: string) {
    const score = await this.prisma.multiDimensionalScore.findUnique({
      where: { id: scoreId }
    });

    if (!score) throw new Error('Score not found');

    const dimensions = [
      { name: 'EMOTIONAL', val: score.emotional },
      { name: 'COGNITIVE', val: score.cognitive },
      { name: 'BEHAVIORAL', val: score.behavioral },
      { name: 'PHYSIOLOGICAL', val: score.physiological },
      { name: 'TEMPORAL', val: score.temporal },
    ];

    dimensions.sort((a, b) => b.val - a.val);
    const topFactor = dimensions[0];
    const secondFactor = dimensions[1];

    let insightText = '';

    try {
      const axios = require('axios');
      const prompt = `
        Analyze this clinical profile for a mental health assessment:
        - Overall Index (CMHI): ${score.cmhi.toFixed(1)}
        - Risk Category: ${score.riskCategory}
        - Primary Driver: ${topFactor.name} (${topFactor.val.toFixed(1)}%)
        - Secondary Driver: ${secondFactor.name} (${secondFactor.val.toFixed(1)}%)
        - Dimension Scores: Emotional=${score.emotional.toFixed(1)}, Cognitive=${score.cognitive.toFixed(1)}, Behavioral=${score.behavioral.toFixed(1)}, Physiological=${score.physiological.toFixed(1)}.
        
        Provide a supportive, professional, and detailed therapeutic narrative (3-4 sentences). 
        Acknowledge the primary drivers and provide one actionable clinical recommendation.
        Keep the tone empowering.
      `;

      this.logger.log(`Calling AI Service for score ${scoreId}...`);
      const response = await axios.post(
        `${process.env.AI_SERVICE_URL}/chat/generate`,
        { prompt },
        {
          headers: { 'x-bridge-secret': process.env.FASTAPI_BRIDGE_SECRET },
          timeout: 15000, // Increased for stability
        }
      );
      
      // Handle various possible response structures from FastAPI
      insightText = response.data.reply || response.data.answer || response.data.text || '';
      
      if (!insightText) {
        throw new Error(`Empty AI response. Keys found: ${Object.keys(response.data).join(', ')}`);
      }

    } catch (e) {
      const errorMessage = e.response ? JSON.stringify(e.response.data) : e.message;
      this.logger.error(`AI Insight Generation Failed: ${errorMessage}`);
      
      // Enhanced Fallback Template (More professional)
      insightText = `Your current clinical profile indicates ${score.riskCategory.toLowerCase()} levels of distress, primarily concentrated in the ${topFactor.name.toLowerCase()} domain. While we stabilize the personalized AI connection, we recommend prioritizing self-regulation and monitoring these ${topFactor.name.toLowerCase()} patterns.`;
    }

    const explanation = await this.prisma.scoreExplanation.create({
      data: {
        scoreId,
        insightText,
        topFactor: topFactor.name,
      }
    });

    return explanation;
  }
}
