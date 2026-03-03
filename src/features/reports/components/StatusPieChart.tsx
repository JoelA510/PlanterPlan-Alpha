import { useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from '@/shared/ui/chart';
import { TASK_STATUS } from '@/shared/constants';
import { CHART_COLORS } from '@/app/constants/colors';

interface ChartTask {
    id: string;
    status?: string;
    [key: string]: unknown;
}

interface StatusPieChartProps {
    tasks: ChartTask[];
}

interface PieDataEntry {
    name: string;
    count: number;
    fill: string;
}

const StatusPieChart = ({ tasks }: StatusPieChartProps) => {
    const data: PieDataEntry[] = useMemo(() => {
        return [
            {
                name: 'To Do',
                count: tasks.filter((t) => t.status === TASK_STATUS.TODO || !t.status).length,
                fill: CHART_COLORS[TASK_STATUS.TODO],
            },
            {
                name: 'In Progress',
                count: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length,
                fill: CHART_COLORS[TASK_STATUS.IN_PROGRESS],
            },
            {
                name: 'Blocked',
                count: tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length,
                fill: CHART_COLORS[TASK_STATUS.BLOCKED],
            },
            {
                name: 'Completed',
                count: tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length,
                fill: CHART_COLORS[TASK_STATUS.COMPLETED],
            },
        ];
    }, [tasks]);

    const chartConfig = useMemo(() => ({
        [TASK_STATUS.TODO]: { label: 'To Do', color: CHART_COLORS[TASK_STATUS.TODO] },
        [TASK_STATUS.IN_PROGRESS]: { label: 'In Progress', color: CHART_COLORS[TASK_STATUS.IN_PROGRESS] },
        [TASK_STATUS.BLOCKED]: { label: 'Blocked', color: CHART_COLORS[TASK_STATUS.BLOCKED] },
        [TASK_STATUS.COMPLETED]: { label: 'Completed', color: CHART_COLORS[TASK_STATUS.COMPLETED] },
    }), []);

    return (
        <div className="w-full h-full pb-6">
            <ChartContainer config={chartConfig} className="h-full w-full">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
            </ChartContainer>
        </div>
    );
};

export default StatusPieChart;
