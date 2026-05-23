import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const API_BASE_URL = 'http://localhost:8080';

type JourneyResponse = {
  type: 'direct' | 'interchange' | 'multi_stop' | 'not_found';
  duration: string;
  fare: string;
  steps: Array<{ route: string; from: string; to: string }>;
  narration?: {
    summary: { duration: string; fare: string };
    instructions: string[];
    last_mile: string;
    travel_tip: string;
  };
};

async function postJourney(from: string, to: string): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}/plan-journey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, include_ai: true }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Could not plan journey');
  }

  return response.json();
}

export function JourneyResult({ from, to }: { from: string; to: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<JourneyResponse | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlan(await postJourney(from, to));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Journey planner failed');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  return (
    <View>
      <Pressable onPress={loadPlan} disabled={loading}>
        <Text>{loading ? 'Planning...' : 'Plan Journey'}</Text>
      </Pressable>

      {loading && <ActivityIndicator />}
      {error ? <Text>{error}</Text> : null}

      {plan?.narration?.instructions.map((instruction, index) => (
        <Text key={`${index}-${instruction}`}>{index + 1}. {instruction}</Text>
      ))}

      {plan ? <Text>{plan.duration} | Rs {plan.fare}</Text> : null}

      {error ? (
        <Pressable onPress={loadPlan}>
          <Text>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
