import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from '@/shared/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from '@/shared/ui/chart';

const chartConfig = {
    completed: {
        label: "Completed",
        color: "var(--color-emerald-500)", // emerald-500
    },
    remaining: {
        label: "Remaining",
        color: "var(--color-slate-200)", // slate-200
    },
};

const PhaseBarChart = memo(function PhaseBarChart({ data }) {
    return (
        <Card className="p-8 border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Progress by Phase</h3>
            {data.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            axisLine={false}
                            tickLine={false}
                            className="text-sm font-medium text-slate-600"
                        />
                        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar
                            dataKey="completed"
                            stackId="a"
                            fill="var(--color-completed)"
                            radius={[4, 0, 0, 4]}
                        />
                        <Bar
                            dataKey="remaining"
                            stackId="a"
                            fill="var(--color-remaining)"
                            radius={[0, 4, 4, 0]}
                        />
                    </BarChart>
                </ChartContainer>
            ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                    No phases to display
                </div>
            )}
        </Card>
    );
});



export default PhaseBarChart;
