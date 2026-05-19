import { LineChart, Line, ResponsiveContainer } from 'recharts';
interface SparklineProps { data: number[]; color?: string; }
export function Sparkline({ data, color = 'var(--brand-500)' }: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
