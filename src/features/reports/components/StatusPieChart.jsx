import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Card } from '@shared/ui/card';

export default function StatusPieChart({ data }) {
    return (
        <Card className="p-8 border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Task Distribution</h3>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                    No tasks to display
                </div>
            )}
        </Card>
    );
}
