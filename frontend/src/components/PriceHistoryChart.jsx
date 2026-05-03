import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-gray-900">{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function PriceHistoryChart({ history, targetPrice }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No price history yet
      </div>
    );
  }

  const data = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: h.price,
  }));

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.15 || 100;
  const yMin = Math.max(0, Math.floor(minPrice - padding));
  const yMax = Math.ceil(maxPrice + padding);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#667eea" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        {targetPrice && (
          <ReferenceLine
            y={targetPrice}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{ value: `Target ${fmt(targetPrice)}`, position: 'insideTopRight', fontSize: 11, fill: '#22c55e' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="price"
          stroke="#667eea"
          strokeWidth={2.5}
          fill="url(#priceGradient)"
          dot={data.length <= 10 ? { r: 3, fill: '#667eea', strokeWidth: 0 } : false}
          activeDot={{ r: 5, fill: '#667eea', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
