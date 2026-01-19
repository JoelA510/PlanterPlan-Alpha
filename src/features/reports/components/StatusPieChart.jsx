import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TASK_STATUS } from '@app/constants/index';
import { CHART_COLORS } from '@app/constants/colors';

const StatusPieChart = ({ tasks }) => {
    const data = useMemo(() => {
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

    return (
        <div className="w-full h-full pb-6">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

StatusPieChart.propTypes = {
    tasks: PropTypes.array.isRequired,
};

export default StatusPieChart;
