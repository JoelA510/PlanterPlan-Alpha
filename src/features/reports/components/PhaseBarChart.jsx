import React, { memo } from 'react';
import PropTypes from 'prop-types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card } from '@shared/ui/card';

const PhaseBarChart = memo(function PhaseBarChart({ data }) {
    return (
        <Card className="p-8 border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Progress by Phase</h3>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" domain={[0, 'dataMax']} />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const itemData = payload[0].payload;
                                    return (
                                        <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-orange-200">
                                            <p className="font-bold text-slate-900 mb-2">{itemData.fullName}</p>
                                            <div className="space-y-1">
                                                <p className="text-sm text-green-600 font-medium">
                                                    Completed: {itemData.completed}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    Remaining: {itemData.remaining}
                                                </p>
                                                <p className="text-sm font-bold text-orange-600 mt-2">
                                                    Progress: {itemData.progress}%
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="completed"
                            stackId="a"
                            fill="var(--color-emerald-500)"
                            name="Completed"
                        />
                        <Bar
                            dataKey="remaining"
                            stackId="a"
                            fill="var(--color-slate-200)"
                            name="Remaining"
                        />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-72 flex items-center justify-center text-slate-500">
                    No phases to display
                </div>
            )}
        </Card>
    );
});

PhaseBarChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            fullName: PropTypes.string,
            completed: PropTypes.number.isRequired,
            remaining: PropTypes.number.isRequired,
            progress: PropTypes.number,
        })
    ).isRequired,
};

export default PhaseBarChart;
