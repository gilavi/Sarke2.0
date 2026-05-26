import { LineChart, Line, ResponsiveContainer } from 'recharts';
interface SparklineProps { data: number[]; color?: string; }
// Fixed render box for the sparkline. Keeping these in sync with the
// container's h-10 w-24 (40x96) lets ResponsiveContainer skip its initial
// 0-width measurement, which is what produced the recharts
// "width(-1) height(-1)" warnings on home load.
const W = 96;
const H = 40;
export function Sparkline({ data, color = 'var(--brand-500)' }: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-24" style={{ width: W, height: H }}>
      <ResponsiveContainer width={W} height={H} minWidth={0}>
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
