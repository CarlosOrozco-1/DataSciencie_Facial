'use server';
/**
 * @fileOverview A Genkit flow for detecting the gender of a person in a webcam image.
 *
 * - detectGenderFromWebcam - A function that handles the gender detection process.
 * - GenderDetectionInput - The input type for the detectGenderFromWebcam function.
 * - GenderDetectionOutput - The return type for the detectGenderFromWebcam function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenderDetectionInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo from the webcam, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenderDetectionInput = z.infer<typeof GenderDetectionInputSchema>;

const GenderDetectionOutputSchema = z.object({
  gender: z.enum(['male', 'female', 'none_detected']).describe("The detected gender of the person in the image, or 'none_detected' if no person is clearly visible or gender cannot be determined."),
});
export type GenderDetectionOutput = z.infer<typeof GenderDetectionOutputSchema>;

/**
 * Detects the gender of a person from a webcam image.
 * @param input - The input containing the image data URI.
 * @returns The detected gender.
 */
export async function detectGenderFromWebcam(input: GenderDetectionInput): Promise<GenderDetectionOutput> {
  return genderDetectionFlow(input);
}

const genderDetectionPrompt = ai.definePrompt({
  name: 'genderDetectionPrompt',
  input: { schema: GenderDetectionInputSchema },
  output: { schema: GenderDetectionOutputSchema },
  model: 'googleai/gemini-1.5-flash', // Cambiado a 1.5-flash por ser más estable y tener mejor cuota
  prompt: `Analyze the provided image from a webcam feed.
If there is one person clearly visible in the image, identify their gender as 'male' or 'female'.
If no person is clearly identifiable, multiple people are visible, or the gender cannot be determined, respond with 'none_detected'.
Your output MUST be a JSON object conforming to the output schema. Do NOT include any other text or explanation.

Image: {{media url=imageDataUri}}`,
});

const genderDetectionFlow = ai.defineFlow(
  {
    name: 'genderDetectionFlow',
    inputSchema: GenderDetectionInputSchema,
    outputSchema: GenderDetectionOutputSchema,
  },
  async (input) => {
    const { output } = await genderDetectionPrompt(input);
    if (!output) {
      return { gender: 'none_detected' };
    }
    return output;
  }
);
