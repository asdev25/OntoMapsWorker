import { Node } from 'reactflow';

interface AIConfig {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    demoMode?: boolean;
}

interface GenerateResponse {
    steps: string[];
}

export const generateBridge = async (
    start: string,
    end: string,
    config: AIConfig
): Promise<string[]> => {
    if (config.demoMode) {
        return [];
    }

    if (!config.apiKey) {
        throw new Error('API Key is missing');
    }

    const prompt = `Given the starting concept "${start}" and the ending concept "${end}", generate 3 to 5 logical intermediate sub-topics or steps required to bridge the gap conceptually. Return existing JSON content only. The response must be a JSON object with a single key "steps" containing an array of strings. Example: {"steps": ["Step 1", "Step 2"]}`;

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.modelName,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that generates logical concept bridges. Output JSON only.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate path');
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content received from AI');
        }

        // Try parsing JSON from content
        try {
            // Handle potential markdown code blocks in response
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            if (Array.isArray(parsed.steps)) {
                return parsed.steps;
            }
            return [];
        } catch (e) {
            console.error("Failed to parse AI response:", content);
            throw new Error("Failed to parse AI response");
        }

    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    }
};

export const expandNode = async (
    nodeLabel: string,
    config: AIConfig
): Promise<string[]> => {

    if (config.demoMode) {
        // Mock response for demo
        await new Promise(r => setTimeout(r, 800)); // Fake latency
        return [
            `${nodeLabel} - Branch A`,
            `${nodeLabel} - Branch B`,
            `${nodeLabel} - Branch C`,
            `Why ${nodeLabel}?`,
            `History of ${nodeLabel}`
        ];
    }

    if (!config.apiKey) {
        throw new Error('API Key is missing');
    }

    const prompt = `Given the concept "${nodeLabel}", generate 3 to 5 direct sub-topics or related concepts to expand on it. Return existing JSON content only. The response must be a JSON object with a single key "steps" containing an array of strings.`;

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.modelName,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that expands concepts. Output JSON only.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to expand node');
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content received from AI');
        }

        // Try parsing JSON from content
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            if (Array.isArray(parsed.steps)) {
                return parsed.steps;
            }
            return [];
        } catch (e) {
            console.error("Failed to parse AI response:", content);
            throw new Error("Failed to parse AI response");
        }

    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    }
};

export const fetchNodeDetails = async (
    label: string,
    config: AIConfig
): Promise<string> => {
    if (config.demoMode) {
        await new Promise(r => setTimeout(r, 600));
        return `This is a simulated AI description for "${label}". It represents a key entity in the knowledge graph, connected to various sub-disciplines and historical contexts.`;
    }

    if (!config.apiKey) return "API Key required for insights.";

    const prompt = `Provide a concise, 1-2 sentence academic definition or context for the concept: "${label}". Return plain text only.`;

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.modelName,
                messages: [
                    { role: 'system', content: 'You are a concise academic encyclopedia. Output plain text only.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.5,
                max_tokens: 100
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
            console.warn("AI API Failed:", errorMessage);
            return `Error: ${errorMessage}`;
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "No details available.";

    } catch (error) {
        console.error('AI Details Error:', error);
        return `Error: ${(error as Error).message}`;
    }
};
